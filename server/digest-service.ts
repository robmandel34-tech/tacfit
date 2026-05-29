// Per-competition digest — builds a readable status report for each active
// competition and posts it to Slack several times a day. Covers standings,
// recent activity submissions, team activity (chat + tasks + activities), and
// engagement-risk callouts so the admin can spot disengaging teams/members.
//
// Scheduling is handled by node-cron in startDigestScheduler(). Everything is
// wrapped so a failure never crashes the server.

import cron from "node-cron";
import { storage } from "./storage";
import { notifySlack } from "./slack-service";

// How far back the "recent activity" metrics look. A team/member with nothing
// in this window is treated as quiet / at risk.
const WINDOW_HOURS = 24;
const MEMBER_RISK_HOURS = 48;

// When the digest runs. Comma-separated 24h hours, in DIGEST_TZ.
// Defaults to 8am, 1pm, 8pm Eastern.
const DIGEST_HOURS = process.env.DIGEST_HOURS || "8,13,20";
const DIGEST_TZ = process.env.DIGEST_TZ || "America/New_York";

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

function dayInfo(startDate: Date, endDate: Date): string {
  const now = Date.now();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  const totalDays = Math.max(1, Math.round((end - start) / dayMs));
  const currentDay = Math.max(1, Math.ceil((now - start) / dayMs));
  const dayShown = Math.min(currentDay, totalDays);
  return `Day ${dayShown} of ${totalDays}`;
}

// Competitions that are live right now: active, not completed, started, not ended.
async function getLiveCompetitions() {
  const all = await storage.getCompetitions();
  const now = Date.now();
  return all.filter((c: any) => {
    if (c.isActive === false || c.isCompleted) return false;
    const start = c.startDate ? new Date(c.startDate).getTime() : 0;
    const end = c.endDate ? new Date(c.endDate).getTime() : Infinity;
    return start <= now && now <= end;
  });
}

export async function buildCompetitionDigest(comp: any): Promise<string> {
  const windowCutoff = hoursAgo(WINDOW_HOURS);
  const memberCutoff = hoursAgo(MEMBER_RISK_HOURS);

  const [teams, allActivities] = await Promise.all([
    storage.getTeamsByCompetition(comp.id),
    storage.getActivitiesByCompetition(comp.id),
  ]);

  const recentActivities = allActivities.filter(
    (a: any) => a.createdAt && new Date(a.createdAt) >= windowCutoff,
  );

  // userIds that submitted at least one activity within the member-risk window.
  const activeUserIds = new Set<number>(
    allActivities
      .filter((a: any) => a.createdAt && new Date(a.createdAt) >= memberCutoff && a.userId != null)
      .map((a: any) => a.userId as number),
  );

  // Standings — teams by points (desc).
  const standings = [...teams].sort((a: any, b: any) => (b.points || 0) - (a.points || 0));

  // Per-team breakdown (gather chat, tasks, members in parallel per team).
  const teamReports = await Promise.all(
    teams.map(async (team: any) => {
      const [chat, tasks, members] = await Promise.all([
        storage.getChatMessages(team.id),
        storage.getMissionTasks(team.id),
        storage.getTeamMembers(team.id),
      ]);

      const recentChat = chat.filter(
        (m: any) => m.createdAt && new Date(m.createdAt) >= windowCutoff,
      );
      const teamRecentActs = recentActivities.filter((a: any) => a.teamId === team.id);
      const completedRecentTasks = tasks.filter(
        (t: any) =>
          (t.status === "completed" || t.completed === true) &&
          t.updatedAt &&
          new Date(t.updatedAt) >= windowCutoff,
      );
      const overdueTasks = tasks.filter(
        (t: any) =>
          t.status !== "completed" &&
          t.completed !== true &&
          t.dueDate &&
          new Date(t.dueDate) < new Date(),
      );

      const isActive =
        teamRecentActs.length > 0 || recentChat.length > 0 || completedRecentTasks.length > 0;

      // Roster = joined members + the captain (stored separately on the team).
      const memberIds = new Set<number>(
        members.map((mem: any) => mem.userId).filter((id: any) => id != null),
      );
      if (team.captainId != null) memberIds.add(team.captainId);

      // Members who haven't submitted any activity within the risk window.
      const memberUsers = await Promise.all(
        [...memberIds].map((id) => storage.getUser(id)),
      );
      const quietMembers = memberUsers
        .filter((u: any) => u && !activeUserIds.has(u.id))
        .map((u: any) => u.username);

      return {
        team,
        recentActsCount: teamRecentActs.length,
        recentChatCount: recentChat.length,
        completedTasksCount: completedRecentTasks.length,
        overdueCount: overdueTasks.length,
        memberCount: memberIds.size,
        quietMembers,
        isActive,
      };
    }),
  );

  // ---- Build the message ----
  const lines: string[] = [];
  lines.push(`*📊 ${comp.name} — ${dayInfo(comp.startDate, comp.endDate)}*`);
  lines.push(
    `_Last ${WINDOW_HOURS}h:_ ${recentActivities.length} activity submission${recentActivities.length === 1 ? "" : "s"} · ${teams.length} team${teams.length === 1 ? "" : "s"}`,
  );

  // Standings
  lines.push("");
  lines.push("*🏆 Standings*");
  if (standings.length === 0) {
    lines.push("_No teams yet._");
  } else {
    const medals = ["🥇", "🥈", "🥉"];
    standings.slice(0, 8).forEach((t: any, i: number) => {
      const marker = medals[i] || `${i + 1}.`;
      lines.push(`${marker} ${t.name} — ${t.points || 0} pts`);
    });
  }

  // Team activity
  lines.push("");
  lines.push("*🔥 Team activity (last 24h)*");
  const sortedReports = [...teamReports].sort(
    (a, b) =>
      b.recentActsCount + b.recentChatCount + b.completedTasksCount -
      (a.recentActsCount + a.recentChatCount + a.completedTasksCount),
  );
  if (sortedReports.length === 0) {
    lines.push("_No teams yet._");
  } else {
    sortedReports.forEach((r) => {
      const dot = r.isActive ? "🟢" : "⚪";
      lines.push(
        `${dot} ${r.team.name}: ${r.recentActsCount} activities · ${r.recentChatCount} chats · ${r.completedTasksCount} tasks done`,
      );
    });
  }

  // Engagement risk. A team counts as "quiet" only if it has a real roster or
  // standing — orphaned placeholder teams (no members, no points) are ignored.
  const quietTeams = teamReports.filter(
    (r) => !r.isActive && (r.memberCount > 0 || (r.team.points || 0) > 0),
  );
  const overdueTeams = teamReports.filter((r) => r.overdueCount > 0);
  const atRiskMembers = teamReports
    .filter((r) => r.quietMembers.length > 0)
    .map((r) => `${r.team.name}: ${r.quietMembers.join(", ")}`);

  if (quietTeams.length || overdueTeams.length || atRiskMembers.length) {
    lines.push("");
    lines.push("*⚠️ Engagement risks*");
    if (quietTeams.length) {
      lines.push(`• Quiet teams (no activity, chat, or task progress in 24h): ${quietTeams.map((r) => r.team.name).join(", ")}`);
    }
    if (atRiskMembers.length) {
      lines.push(`• Members silent ${MEMBER_RISK_HOURS}h+ (no submissions): ${atRiskMembers.join(" | ")}`);
    }
    if (overdueTeams.length) {
      lines.push(
        `• Overdue tasks: ${overdueTeams.map((r) => `${r.team.name} (${r.overdueCount})`).join(", ")}`,
      );
    }
  } else if (teams.length > 0 && teamReports.every((r) => r.isActive)) {
    lines.push("");
    lines.push("*✅ No engagement risks — everyone's active.*");
  }

  return lines.join("\n");
}

// Build and post digests for every live competition.
export async function runDigest(): Promise<{ posted: number }> {
  let posted = 0;
  try {
    const comps = await getLiveCompetitions();
    if (comps.length === 0) {
      return { posted: 0 };
    }
    for (const comp of comps) {
      try {
        const text = await buildCompetitionDigest(comp);
        notifySlack(text);
        posted += 1;
      } catch (err) {
        console.error(`Digest failed for competition ${comp.id}:`, err);
      }
    }
  } catch (err) {
    console.error("Digest run failed:", err);
  }
  return { posted };
}

// Schedule the digest to run at DIGEST_HOURS in DIGEST_TZ.
export function startDigestScheduler(): void {
  const hours = DIGEST_HOURS.split(",")
    .map((h) => h.trim())
    .filter((h) => h !== "")
    .join(",");
  const expr = `0 ${hours} * * *`;

  if (!cron.validate(expr)) {
    console.error(`Invalid digest cron expression "${expr}" — scheduler not started.`);
    return;
  }

  // Validate the timezone separately — an invalid TZ would otherwise throw at
  // schedule time and must never crash server startup.
  let timezone: string | undefined = DIGEST_TZ;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: DIGEST_TZ });
  } catch {
    console.error(`Invalid digest timezone "${DIGEST_TZ}" — falling back to server time.`);
    timezone = undefined;
  }

  try {
    cron.schedule(expr, () => {
      void runDigest();
    }, timezone ? { timezone } : undefined);
    console.log(`Competition digest scheduled at hours [${hours}] ${timezone || "(server time)"}.`);
  } catch (err) {
    console.error("Failed to start digest scheduler:", err);
  }
}
