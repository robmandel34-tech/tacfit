import { 
  User, InsertUser, Competition, InsertCompetition, Team, InsertTeam, 
  TeamMember, InsertTeamMember, Activity, InsertActivity, ActivityComment, 
  InsertActivityComment, ActivityLike, ActivityFlag, InsertActivityFlag, 
  ChatMessage, InsertChatMessage, Friendship, InsertFriendship, CompetitionHistory, 
  CompetitionInvitation, InsertCompetitionInvitation, CompetitionEntry, 
  InsertCompetitionEntry, WhiteboardItem, InsertWhiteboardItem, MissionTask, InsertMissionTask,
  users, competitions, teams, teamMembers, activities, 
  activityComments, activityLikes, activityFlags, chatMessages, friendships, 
  competitionHistory, competitionInvitations, competitionEntries, whiteboardItems, missionTasks
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc } from "drizzle-orm";
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users);
    return allUsers;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, points: insertUser.points || 0 })
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // Competition operations
  async getCompetitions(): Promise<Competition[]> {
    return await db.select().from(competitions);
  }

  async getCompetition(id: number): Promise<Competition | undefined> {
    const [competition] = await db.select().from(competitions).where(eq(competitions.id, id));
    return competition || undefined;
  }

  async createCompetition(insertCompetition: InsertCompetition): Promise<Competition> {
    const [competition] = await db
      .insert(competitions)
      .values(insertCompetition)
      .returning();
    return competition;
  }

  async updateCompetition(id: number, updates: Partial<Competition>): Promise<Competition | undefined> {
    const [competition] = await db
      .update(competitions)
      .set(updates)
      .where(eq(competitions.id, id))
      .returning();
    return competition || undefined;
  }

  async deleteCompetition(id: number): Promise<boolean> {
    const result = await db
      .delete(competitions)
      .where(eq(competitions.id, id));
    return result.rowCount > 0;
  }

  // Team operations
  async getTeams(): Promise<Team[]> {
    return await db.select().from(teams);
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team || undefined;
  }

  async getTeamsByCompetition(competitionId: number): Promise<Team[]> {
    return await db.select().from(teams).where(eq(teams.competitionId, competitionId));
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const [team] = await db
      .insert(teams)
      .values(insertTeam)
      .returning();
    return team;
  }

  async updateTeam(id: number, updates: Partial<Team>): Promise<Team | undefined> {
    const [team] = await db
      .update(teams)
      .set(updates)
      .where(eq(teams.id, id))
      .returning();
    return team || undefined;
  }

  // Team member operations
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
  }

  async getTeamMember(teamId: number, userId: number): Promise<TeamMember | undefined> {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
    return member || undefined;
  }

  async getUserTeam(userId: number, competitionId: number): Promise<TeamMember | undefined> {
    const [result] = await db
      .select({ teamMember: teamMembers })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(and(eq(teamMembers.userId, userId), eq(teams.competitionId, competitionId)));
    return result?.teamMember || undefined;
  }

  async addTeamMember(insertMember: InsertTeamMember): Promise<TeamMember> {
    const [member] = await db
      .insert(teamMembers)
      .values(insertMember)
      .returning();
    return member;
  }

  async removeTeamMember(teamId: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
    return result.rowCount > 0;
  }

  // Activity operations
  async getActivities(): Promise<Activity[]> {
    return await db.select().from(activities).orderBy(desc(activities.createdAt));
  }

  async getActivity(id: number): Promise<Activity | undefined> {
    const [activity] = await db.select().from(activities).where(eq(activities.id, id));
    return activity || undefined;
  }

  async getActivitiesByCompetition(competitionId: number): Promise<Activity[]> {
    return await db.select().from(activities).where(eq(activities.competitionId, competitionId)).orderBy(desc(activities.createdAt));
  }

  async getActivitiesByTeam(teamId: number): Promise<Activity[]> {
    return await db.select().from(activities).where(eq(activities.teamId, teamId)).orderBy(desc(activities.createdAt));
  }

  async getActivitiesByUser(userId: number): Promise<Activity[]> {
    return await db.select().from(activities).where(eq(activities.userId, userId)).orderBy(desc(activities.createdAt));
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db
      .insert(activities)
      .values(insertActivity)
      .returning();
    return activity;
  }

  async updateActivity(id: number, updates: Partial<Activity>): Promise<Activity | undefined> {
    const [activity] = await db
      .update(activities)
      .set(updates)
      .where(eq(activities.id, id))
      .returning();
    return activity || undefined;
  }

  // Activity comment operations
  async getActivityComments(activityId: number): Promise<ActivityComment[]> {
    return await db.select().from(activityComments).where(eq(activityComments.activityId, activityId));
  }

  async createActivityComment(insertComment: InsertActivityComment): Promise<ActivityComment> {
    const [comment] = await db
      .insert(activityComments)
      .values(insertComment)
      .returning();
    return comment;
  }

  // Activity like operations
  async getActivityLikes(activityId: number): Promise<ActivityLike[]> {
    return await db.select().from(activityLikes).where(eq(activityLikes.activityId, activityId));
  }

  async toggleActivityLike(activityId: number, userId: number): Promise<boolean> {
    const [existingLike] = await db
      .select()
      .from(activityLikes)
      .where(and(eq(activityLikes.activityId, activityId), eq(activityLikes.userId, userId)));

    if (existingLike) {
      await db
        .delete(activityLikes)
        .where(and(eq(activityLikes.activityId, activityId), eq(activityLikes.userId, userId)));
      return false;
    } else {
      await db
        .insert(activityLikes)
        .values({ activityId, userId });
      return true;
    }
  }

  // Activity flag operations
  async getActivityFlags(activityId: number): Promise<ActivityFlag[]> {
    return await db.select().from(activityFlags).where(eq(activityFlags.activityId, activityId));
  }

  async toggleActivityFlag(activityId: number, userId: number): Promise<boolean> {
    const [existingFlag] = await db
      .select()
      .from(activityFlags)
      .where(and(eq(activityFlags.activityId, activityId), eq(activityFlags.userId, userId)));

    if (existingFlag) {
      await db
        .delete(activityFlags)
        .where(and(eq(activityFlags.activityId, activityId), eq(activityFlags.userId, userId)));
      return false;
    } else {
      await db
        .insert(activityFlags)
        .values({ activityId, userId });
      return true;
    }
  }

  // Chat operations
  async getChatMessages(teamId?: number, competitionId?: number): Promise<ChatMessage[]> {
    let query = db.select().from(chatMessages);
    
    if (teamId) {
      query = query.where(eq(chatMessages.teamId, teamId));
    } else if (competitionId) {
      query = query.where(eq(chatMessages.competitionId, competitionId));
    }
    
    return await query;
  }

  async getDirectMessages(userId1: number, userId2: number): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.type, "direct"),
          or(
            and(eq(chatMessages.senderId, userId1), eq(chatMessages.receiverId, userId2)),
            and(eq(chatMessages.senderId, userId2), eq(chatMessages.receiverId, userId1))
          )
        )
      )
      .orderBy(chatMessages.createdAt);
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values(insertMessage)
      .returning();
    return message;
  }

  // Friend operations
  async getFriendships(userId: number): Promise<Friendship[]> {
    return await db
      .select()
      .from(friendships)
      .where(eq(friendships.userId, userId));
  }

  async createFriendship(insertFriendship: InsertFriendship): Promise<Friendship> {
    const [friendship] = await db
      .insert(friendships)
      .values(insertFriendship)
      .returning();
    return friendship;
  }

  async updateFriendship(id: number, status: string): Promise<Friendship | undefined> {
    const [friendship] = await db
      .update(friendships)
      .set({ status })
      .where(eq(friendships.id, id))
      .returning();
    return friendship || undefined;
  }

  // Competition history operations
  async getCompetitionHistory(userId: number): Promise<CompetitionHistory[]> {
    return await db
      .select()
      .from(competitionHistory)
      .where(eq(competitionHistory.userId, userId));
  }

  async createCompetitionHistory(insertHistory: Omit<CompetitionHistory, 'id'>): Promise<CompetitionHistory> {
    const [history] = await db
      .insert(competitionHistory)
      .values(insertHistory)
      .returning();
    return history;
  }

  // Competition invitation operations
  async createCompetitionInvitation(invitation: InsertCompetitionInvitation): Promise<CompetitionInvitation> {
    const [invite] = await db
      .insert(competitionInvitations)
      .values(invitation)
      .returning();
    return invite;
  }

  async getCompetitionInvitation(token: string): Promise<CompetitionInvitation | undefined> {
    const [invite] = await db
      .select()
      .from(competitionInvitations)
      .where(eq(competitionInvitations.inviteToken, token));
    return invite || undefined;
  }

  async updateCompetitionInvitation(id: number, updates: Partial<CompetitionInvitation>): Promise<CompetitionInvitation | undefined> {
    const [invite] = await db
      .update(competitionInvitations)
      .set(updates)
      .where(eq(competitionInvitations.id, id))
      .returning();
    return invite || undefined;
  }

  async getCompetitionInvitationsByUser(userId: number): Promise<CompetitionInvitation[]> {
    return await db
      .select()
      .from(competitionInvitations)
      .where(eq(competitionInvitations.invitedBy, userId));
  }

  // Competition entry operations
  async createCompetitionEntry(entry: InsertCompetitionEntry): Promise<CompetitionEntry> {
    const [entryRecord] = await db
      .insert(competitionEntries)
      .values(entry)
      .returning();
    return entryRecord;
  }

  async getCompetitionEntry(userId: number, competitionId: number): Promise<CompetitionEntry | undefined> {
    const [entry] = await db
      .select()
      .from(competitionEntries)
      .where(and(
        eq(competitionEntries.userId, userId),
        eq(competitionEntries.competitionId, competitionId)
      ));
    return entry || undefined;
  }

  async updateCompetitionEntry(id: number, updates: Partial<CompetitionEntry>): Promise<CompetitionEntry | undefined> {
    const [entry] = await db
      .update(competitionEntries)
      .set(updates)
      .where(eq(competitionEntries.id, id))
      .returning();
    return entry || undefined;
  }

  async getUserCompetitionEntries(userId: number): Promise<CompetitionEntry[]> {
    return await db
      .select()
      .from(competitionEntries)
      .where(eq(competitionEntries.userId, userId));
  }

  // Whiteboard operations
  async getWhiteboardItems(teamId: number): Promise<WhiteboardItem[]> {
    return await db.select().from(whiteboardItems).where(eq(whiteboardItems.teamId, teamId));
  }

  async createWhiteboardItem(insertItem: InsertWhiteboardItem): Promise<WhiteboardItem> {
    const [item] = await db.insert(whiteboardItems).values(insertItem).returning();
    return item;
  }

  async updateWhiteboardItemPosition(id: number, positionX: number, positionY: number): Promise<WhiteboardItem | undefined> {
    const [item] = await db
      .update(whiteboardItems)
      .set({ positionX, positionY, updatedAt: new Date() })
      .where(eq(whiteboardItems.id, id))
      .returning();
    return item;
  }

  async updateWhiteboardItemStatus(id: number, status: string): Promise<WhiteboardItem | undefined> {
    const [item] = await db
      .update(whiteboardItems)
      .set({ status, updatedAt: new Date() })
      .where(eq(whiteboardItems.id, id))
      .returning();
    return item;
  }

  async deleteWhiteboardItem(id: number): Promise<boolean> {
    const result = await db.delete(whiteboardItems).where(eq(whiteboardItems.id, id));
    return result.rowCount > 0;
  }

  // Mission task operations
  async getMissionTasks(teamId: number): Promise<MissionTask[]> {
    return await db
      .select()
      .from(missionTasks)
      .where(eq(missionTasks.teamId, teamId))
      .orderBy(desc(missionTasks.createdAt));
  }

  async createMissionTask(insertTask: InsertMissionTask): Promise<MissionTask> {
    const [task] = await db
      .insert(missionTasks)
      .values(insertTask)
      .returning();
    return task;
  }

  async updateMissionTask(id: string, updates: Partial<MissionTask>): Promise<MissionTask | undefined> {
    const [task] = await db
      .update(missionTasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(missionTasks.id, id))
      .returning();
    return task || undefined;
  }

  async deleteMissionTask(id: string): Promise<boolean> {
    const result = await db.delete(missionTasks).where(eq(missionTasks.id, id));
    return result.rowCount > 0;
  }
}