// Ghost accounts — admin-operated personas.
//
// A ghost is an ordinary `users` row (visible everywhere like any member) with
// `isGhost = true`, no password and an undeliverable email, so the ONLY way to
// use it is for an admin to "act as" it from their own authenticated session.
//
// How identity resolution works while acting:
//  - Bearer (native app, and web — the global fetch interceptor sends the
//    token everywhere): `auth_tokens.acting_as_user_id` is set on the token the
//    device is using. The bearer bridge in routes.ts then hydrates
//    `req.session.userId` with the ghost and stamps `req.actorUserId` with the
//    real admin. Acting is therefore per device/token.
//  - Cookie-only sessions: `session.userId` becomes the ghost and
//    `session.actorUserId` remembers the admin.
// Every existing route keeps reading `req.session.userId`, so the ghost is a
// plain user to all of them — including admin checks, which correctly fail.
import type { Express, Request, Response } from "express";
import crypto from "crypto";
import { asc, eq } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { authTokens as authTokensTable, users, type User } from "@shared/schema";

export const GHOST_EMAIL_DOMAIN = "ghost.invalid";

export function isGhostEmail(email?: string | null): boolean {
  return !!email && email.trim().toLowerCase().endsWith(`@${GHOST_EMAIL_DOMAIN}`);
}

const USERNAME_RE = /^[A-Za-z0-9][A-Za-z0-9 _.'-]{1,29}$/;

type ActingInfo = { actorId: number; actorUsername: string } | null;

/** The real account behind the request: the admin when acting, else the user. */
export function getActorUserId(req: Request): number | undefined {
  return (req as any).actorUserId ?? req.session?.actorUserId ?? req.session?.userId;
}

/** Non-null only while the request is acting as a ghost. */
export function getActingActorId(req: Request): number | undefined {
  return (req as any).actorUserId ?? req.session?.actorUserId ?? undefined;
}

export async function getActingInfo(req: Request): Promise<ActingInfo> {
  const actorId = getActingActorId(req);
  if (!actorId) return null;
  const actor = await storage.getUser(actorId);
  return actor ? { actorId: actor.id, actorUsername: actor.username } : null;
}

function publicGhost(g: User) {
  return {
    id: g.id,
    username: g.username,
    avatar: g.avatar,
    motto: g.motto,
    points: g.points ?? 0,
    isSuspended: !!g.isSuspended,
    createdAt: g.createdAt,
  };
}

function withoutPassword(u: User) {
  const { password: _password, ...rest } = u;
  return rest;
}

export function registerGhostRoutes(app: Express) {
  // Admin check against the REAL account, so an admin already acting as one
  // ghost can list/switch/return without going back to their own account first.
  const requireActingAdmin = async (req: Request, res: Response): Promise<User | null> => {
    const actorId = getActorUserId(req);
    if (!actorId) {
      res.status(401).json({ message: "Not authenticated" });
      return null;
    }
    const actor = await storage.getUser(actorId);
    if (!actor?.isAdmin) {
      res.status(403).json({ message: "Admin access required" });
      return null;
    }
    return actor;
  };

  app.get("/api/ghosts", async (req, res) => {
    try {
      const actor = await requireActingAdmin(req, res);
      if (!actor) return;
      const ghosts = await db.select().from(users).where(eq(users.isGhost, true)).orderBy(asc(users.username));
      res.json(ghosts.map(publicGhost));
    } catch (error) {
      console.error("[ghost] list failed:", error);
      res.status(500).json({ message: "Failed to load ghost accounts" });
    }
  });

  app.post("/api/ghosts", async (req, res) => {
    try {
      const actor = await requireActingAdmin(req, res);
      if (!actor) return;

      const username = String(req.body?.username ?? "").trim();
      const motto = typeof req.body?.motto === "string" ? req.body.motto.trim().slice(0, 120) : null;
      if (!USERNAME_RE.test(username)) {
        return res.status(400).json({
          message: "Username must be 2–30 characters: letters, numbers, spaces, underscores, periods or hyphens.",
        });
      }
      if (await storage.getUserByUsername(username)) {
        return res.status(409).json({ message: `"${username}" is already taken.` });
      }

      const slug = username.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "ghost";
      const email = `ghost-${slug}-${crypto.randomBytes(3).toString("hex")}@${GHOST_EMAIL_DOMAIN}`;

      const ghost = await storage.createUser({
        username,
        email,
        password: null,
        motto: motto || null,
        isGhost: true,
        isEmailVerified: true,
        onboardingCompleted: true,
        points: 0,
      });
      console.log(`[ghost] ${actor.username} (#${actor.id}) created ghost ${ghost.username} (#${ghost.id})`);
      res.status(201).json(publicGhost(ghost));
    } catch (error) {
      console.error("[ghost] create failed:", error);
      res.status(500).json({ message: "Failed to create ghost account" });
    }
  });

  app.post("/api/ghosts/:id/act-as", async (req, res) => {
    try {
      const actor = await requireActingAdmin(req, res);
      if (!actor) return;

      const ghostId = parseInt(req.params.id, 10);
      const ghost = Number.isFinite(ghostId) ? await storage.getUser(ghostId) : undefined;
      // Never allow acting as a real member — only rows explicitly marked ghost.
      if (!ghost || !ghost.isGhost) {
        return res.status(404).json({ message: "Ghost account not found" });
      }
      if (ghost.isSuspended) {
        return res.status(400).json({ message: "That ghost account is suspended. Unsuspend it first." });
      }

      const respond = () => {
        console.log(`[ghost] ${actor.username} (#${actor.id}) now acting as ${ghost.username} (#${ghost.id})`);
        res.json({ ...withoutPassword(ghost), actingAs: { actorId: actor.id, actorUsername: actor.username } });
      };

      const bearerToken = (req as any).bearerToken as string | undefined;
      if (bearerToken) {
        await db
          .update(authTokensTable)
          .set({ actingAsUserId: ghost.id })
          .where(eq(authTokensTable.token, bearerToken));
        return respond();
      }

      req.session.actorUserId = actor.id;
      req.session.userId = ghost.id;
      req.session.user = ghost;
      req.session.save((err) => {
        if (err) {
          console.error("[ghost] session save failed:", err);
          return res.status(500).json({ message: "Could not switch accounts" });
        }
        respond();
      });
    } catch (error) {
      console.error("[ghost] act-as failed:", error);
      res.status(500).json({ message: "Could not switch accounts" });
    }
  });

  app.post("/api/ghosts/return", async (req, res) => {
    try {
      const actorId = getActingActorId(req);
      if (!actorId) {
        return res.status(400).json({ message: "You're not acting as a ghost right now." });
      }
      const actor = await storage.getUser(actorId);
      if (!actor) {
        return res.status(401).json({ message: "Your account could not be found. Please log in again." });
      }

      const respond = () => {
        console.log(`[ghost] ${actor.username} (#${actor.id}) returned to their own account`);
        res.json({ ...withoutPassword(actor), actingAs: null });
      };

      const bearerToken = (req as any).bearerToken as string | undefined;
      if (bearerToken) {
        await db
          .update(authTokensTable)
          .set({ actingAsUserId: null })
          .where(eq(authTokensTable.token, bearerToken));
        return respond();
      }

      req.session.userId = actor.id;
      req.session.user = actor;
      delete req.session.actorUserId;
      req.session.save((err) => {
        if (err) {
          console.error("[ghost] session save failed:", err);
          return res.status(500).json({ message: "Could not switch back" });
        }
        respond();
      });
    } catch (error) {
      console.error("[ghost] return failed:", error);
      res.status(500).json({ message: "Could not switch back" });
    }
  });
}
