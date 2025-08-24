import { 
  User, InsertUser, Competition, InsertCompetition, Team, InsertTeam, 
  TeamMember, InsertTeamMember, Activity, InsertActivity, ActivityComment, 
  InsertActivityComment, ActivityLike, ActivityFlag, InsertActivityFlag, 
  ChatMessage, InsertChatMessage, Friendship, InsertFriendship, CompetitionHistory, 
  CompetitionInvitation, InsertCompetitionInvitation, CompetitionEntry, 
  InsertCompetitionEntry, PhoneInvitation, InsertPhoneInvitation, WhiteboardItem, 
  InsertWhiteboardItem, MissionTask, InsertMissionTask, ActivityType, InsertActivityType,
  AdminPost, InsertAdminPost, Advertisement, InsertAdvertisement, MoodLog, InsertMoodLog,
  users, competitions, teams, teamMembers, activities, activityTypes,
  activityComments, activityLikes, activityFlags, chatMessages, friendships, 
  competitionHistory, competitionInvitations, competitionEntries, phoneInvitations, 
  whiteboardItems, missionTasks, adminPosts, advertisements, moodLogs
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, isNull, gt, lte, inArray, sql } from "drizzle-orm";
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

  async getUserByEmailVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
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

  async deleteUser(id: number): Promise<boolean> {
    try {
      // Get user's activities first to delete all their related data
      const userActivities = await db.select({ id: activities.id }).from(activities).where(eq(activities.userId, id));
      const activityIds = userActivities.map(a => a.id);
      
      // Delete all data related to user's activities (by activityId)
      if (activityIds.length > 0) {
        await db.delete(activityLikes).where(inArray(activityLikes.activityId, activityIds));
        await db.delete(activityComments).where(inArray(activityComments.activityId, activityIds));
        await db.delete(activityFlags).where(inArray(activityFlags.activityId, activityIds));
      }
      
      // Delete user's own interactions with other activities (by userId)
      await db.delete(activityLikes).where(eq(activityLikes.userId, id));
      await db.delete(activityComments).where(eq(activityComments.userId, id));
      await db.delete(activityFlags).where(eq(activityFlags.userId, id));
      
      // Now safe to delete user's activities
      await db.delete(activities).where(eq(activities.userId, id));
      
      // Delete user's mood entries
      await db.delete(moodLogs).where(eq(moodLogs.userId, id));
      
      // Delete user's team memberships
      await db.delete(teamMembers).where(eq(teamMembers.userId, id));
      
      // Delete user's buddy relationships (both directions)
      await db.delete(friendships).where(eq(friendships.userId, id));
      await db.delete(friendships).where(eq(friendships.friendId, id));
      
      // Delete user's chat messages (both sent and received)
      await db.delete(chatMessages).where(eq(chatMessages.senderId, id));
      await db.delete(chatMessages).where(eq(chatMessages.receiverId, id));
      
      // Delete user's phone invitations
      await db.delete(phoneInvitations).where(eq(phoneInvitations.invitedBy, id));
      
      // Delete user's competition entries
      await db.delete(competitionEntries).where(eq(competitionEntries.userId, id));
      
      // Delete user's competition invitations (only invitedBy field exists)
      await db.delete(competitionInvitations).where(eq(competitionInvitations.invitedBy, id));
      
      // Delete whiteboard items created by or assigned to user
      await db.delete(whiteboardItems).where(or(
        eq(whiteboardItems.createdBy, id),
        eq(whiteboardItems.assignedTo, id)
      ));
      
      // Delete admin posts created by user
      await db.delete(adminPosts).where(eq(adminPosts.createdBy, id));
      
      // Delete competition history for user
      await db.delete(competitionHistory).where(eq(competitionHistory.userId, id));
      
      // Delete competitions created by user (if any)
      await db.delete(competitions).where(eq(competitions.createdBy, id));
      
      // Update teams where user is captain (set captain to null or handle as needed)
      await db.update(teams).set({ captainId: null }).where(eq(teams.captainId, id));
      
      // Finally, delete the user
      const result = await db.delete(users).where(eq(users.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
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
    try {
      // Use a transaction to ensure all related data is deleted consistently
      await db.transaction(async (tx) => {
        // 1. Delete all activities associated with this competition
        await tx.delete(activities).where(eq(activities.competitionId, id));
        
        // 2. Get all teams for this competition
        const competitionTeams = await tx.select().from(teams).where(eq(teams.competitionId, id));
        
        // 3. Delete all team members for teams in this competition
        for (const team of competitionTeams) {
          await tx.delete(teamMembers).where(eq(teamMembers.teamId, team.id));
        }
        
        // 4. Delete all teams associated with this competition
        await tx.delete(teams).where(eq(teams.competitionId, id));
        
        // 5. Delete any competition entries
        await tx.delete(competitionEntries).where(eq(competitionEntries.competitionId, id));
        
        // 6. Delete any competition history entries
        await tx.delete(competitionHistory).where(eq(competitionHistory.competitionId, id));
        
        // 7. Finally, delete the competition itself
        await tx.delete(competitions).where(eq(competitions.id, id));
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting competition:', error);
      return false;
    }
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

  async updateActivitiesTeamId(oldTeamId: number, newTeamId: number | null): Promise<boolean> {
    const result = await db
      .update(activities)
      .set({ teamId: newTeamId })
      .where(eq(activities.teamId, oldTeamId));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteTeam(id: number): Promise<boolean> {
    const result = await db.delete(teams).where(eq(teams.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Team member operations
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return await db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
  }

  async getTeamMembersByUser(userId: number): Promise<TeamMember[]> {
    return await db.select().from(teamMembers).where(eq(teamMembers.userId, userId));
  }

  async getTeamMember(teamId: number, userId: number): Promise<TeamMember | undefined> {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
    return member || undefined;
  }

  async getTeamMemberByUserAndTeam(userId: number, teamId: number): Promise<TeamMember | undefined> {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.userId, userId), eq(teamMembers.teamId, teamId)));
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

  async updateTeamMember(teamId: number, userId: number, updates: Partial<TeamMember>): Promise<TeamMember | undefined> {
    const [member] = await db
      .update(teamMembers)
      .set(updates)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .returning();
    return member || undefined;
  }

  async removeTeamMember(teamId: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
    return (result.rowCount ?? 0) > 0;
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

  async deleteActivity(id: number): Promise<boolean> {
    try {
      // Get the activity details before deleting (to handle points reduction)
      const [activity] = await db.select().from(activities).where(eq(activities.id, id));
      
      if (!activity) {
        return false;
      }

      // Reduce points from user
      if (activity.userId && activity.points) {
        const [user] = await db.select().from(users).where(eq(users.id, activity.userId));
        if (user) {
          const newUserPoints = Math.max(0, (user.points || 0) - activity.points);
          await db.update(users)
            .set({ points: newUserPoints })
            .where(eq(users.id, activity.userId));
        }
      }

      // Reduce points from team
      if (activity.teamId && activity.points) {
        const [team] = await db.select().from(teams).where(eq(teams.id, activity.teamId));
        if (team) {
          const newTeamPoints = Math.max(0, (team.points || 0) - activity.points);
          await db.update(teams)
            .set({ points: newTeamPoints })
            .where(eq(teams.id, activity.teamId));
        }
      }


      // Delete all associated data first (comments, likes, flags)
      await db.delete(activityComments).where(eq(activityComments.activityId, id));
      await db.delete(activityLikes).where(eq(activityLikes.activityId, id));
      await db.delete(activityFlags).where(eq(activityFlags.activityId, id));
      
      // Delete the activity itself
      const result = await db.delete(activities).where(eq(activities.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Error deleting activity:", error);
      return false;
    }
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

  // Activity type operations
  async getActivityTypes(): Promise<ActivityType[]> {
    return await db.select().from(activityTypes).orderBy(activityTypes.name);
  }

  async getActivityType(id: number): Promise<ActivityType | undefined> {
    const [activityType] = await db.select().from(activityTypes).where(eq(activityTypes.id, id));
    return activityType || undefined;
  }

  async createActivityType(insertActivityType: InsertActivityType): Promise<ActivityType> {
    const [activityType] = await db
      .insert(activityTypes)
      .values(insertActivityType)
      .returning();
    return activityType;
  }

  async updateActivityType(id: number, updates: Partial<ActivityType>): Promise<ActivityType | undefined> {
    const [activityType] = await db
      .update(activityTypes)
      .set(updates)
      .where(eq(activityTypes.id, id))
      .returning();
    return activityType || undefined;
  }

  async deleteActivityType(id: number): Promise<boolean> {
    const result = await db
      .delete(activityTypes)
      .where(eq(activityTypes.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Chat operations
  async getChatMessages(teamId?: number, competitionId?: number): Promise<ChatMessage[]> {
    if (teamId) {
      return await db.select().from(chatMessages).where(eq(chatMessages.teamId, teamId));
    } else if (competitionId) {
      return await db.select().from(chatMessages).where(eq(chatMessages.competitionId, competitionId));
    }
    
    return await db.select().from(chatMessages);
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

  async getUserConversations(userId: number): Promise<Array<{
    friendId: number;
    friend: { id: number; username: string; avatar?: string | null };
    lastMessage: ChatMessage | null;
    unreadCount: number;
  }>> {
    // Get all direct message conversations for the user
    const conversations = await db
      .select({
        friendId: sql<number>`CASE 
          WHEN ${chatMessages.senderId} = ${userId} THEN ${chatMessages.receiverId}
          ELSE ${chatMessages.senderId}
        END`,
        lastMessageId: sql<number>`MAX(${chatMessages.id})`,
      })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.type, "direct"),
          or(
            eq(chatMessages.senderId, userId),
            eq(chatMessages.receiverId, userId)
          )
        )
      )
      .groupBy(sql`CASE 
        WHEN ${chatMessages.senderId} = ${userId} THEN ${chatMessages.receiverId}
        ELSE ${chatMessages.senderId}
      END`);

    // Get friend details and last message for each conversation
    const result = await Promise.all(
      conversations.map(async (conv) => {
        const friend = await this.getUser(conv.friendId);
        const lastMessage = conv.lastMessageId 
          ? await db.select().from(chatMessages).where(eq(chatMessages.id, conv.lastMessageId)).limit(1)
          : [];
        
        // Count unread messages (messages sent by friend that haven't been read)
        const unreadMessages = await db
          .select({ count: sql<number>`count(*)` })
          .from(chatMessages)
          .where(
            and(
              eq(chatMessages.type, "direct"),
              eq(chatMessages.senderId, conv.friendId),
              eq(chatMessages.receiverId, userId),
              isNull(chatMessages.readAt)
            )
          );

        return {
          friendId: conv.friendId,
          friend: friend ? { id: friend.id, username: friend.username, avatar: friend.avatar } : { id: conv.friendId, username: "Unknown", avatar: null },
          lastMessage: lastMessage[0] || null,
          unreadCount: unreadMessages[0]?.count || 0
        };
      })
    );

    // Sort by last message timestamp (most recent first)
    return result.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.createdAt!).getTime() - new Date(a.lastMessage.createdAt!).getTime();
    });
  }

  async markMessageAsRead(messageId: number): Promise<void> {
    await db
      .update(chatMessages)
      .set({ readAt: new Date() })
      .where(eq(chatMessages.id, messageId));
  }

  async markConversationAsRead(userId: number, friendId: number): Promise<void> {
    await db
      .update(chatMessages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(chatMessages.type, "direct"),
          eq(chatMessages.senderId, friendId),
          eq(chatMessages.receiverId, userId),
          isNull(chatMessages.readAt)
        )
      );
  }

  // Friend operations
  async getFriendships(userId: number): Promise<Friendship[]> {
    // Get friendships where user is either the requester or the recipient
    // and the friendship is accepted
    const userFriendships = await db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.userId, userId),
          eq(friendships.status, "accepted")
        )
      );
    
    const friendFriendships = await db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.friendId, userId),
          eq(friendships.status, "accepted")
        )
      );
    
    return [...userFriendships, ...friendFriendships];
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

  async deleteFriendship(id: number): Promise<boolean> {
    await db.delete(friendships).where(eq(friendships.id, id));
    return true;
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

  async deleteCompetitionEntry(id: number): Promise<boolean> {
    const result = await db.delete(competitionEntries).where(eq(competitionEntries.id, id));
    return (result.rowCount ?? 0) > 0;
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
    return (result.rowCount ?? 0) > 0;
  }

  // Mission task operations
  async getMissionTasks(teamId: number): Promise<MissionTask[]> {
    return await db
      .select()
      .from(missionTasks)
      .where(eq(missionTasks.teamId, teamId))
      .orderBy(desc(missionTasks.createdAt));
  }

  async getUserPendingTasks(userId: number): Promise<MissionTask[]> {
    // First get the user's current active team
    const [currentMembership] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.userId, userId));
    
    if (!currentMembership) {
      return []; // User has no active team
    }

    // Return only pending tasks from the user's current active team
    return await db
      .select()
      .from(missionTasks)
      .where(
        and(
          eq(missionTasks.assignedTo, userId.toString()),
          eq(missionTasks.completed, false),
          eq(missionTasks.status, 'pending'),
          eq(missionTasks.teamId, currentMembership.teamId!)
        )
      )
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
    return (result.rowCount ?? 0) > 0;
  }

  // Team invitation operations (simplified implementation)
  async createInvitation(invitation: any): Promise<any> {
    // For now, return a mock invitation - this would need proper schema implementation
    return {
      id: Date.now(),
      ...invitation,
      createdAt: new Date(),
    };
  }

  async createUserInvitation(invitation: any): Promise<any> {
    // For now, return a mock invitation - this would need proper schema implementation
    return {
      id: Date.now(),
      ...invitation,
      createdAt: new Date(),
    };
  }

  // Phone invitation operations for referral system
  async createPhoneInvitation(invitation: InsertPhoneInvitation): Promise<PhoneInvitation> {
    const [phoneInvitation] = await db
      .insert(phoneInvitations)
      .values(invitation)
      .returning();
    return phoneInvitation;
  }

  async getPhoneInvitationByToken(token: string): Promise<PhoneInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(phoneInvitations)
      .where(eq(phoneInvitations.inviteToken, token));
    return invitation || undefined;
  }

  async getPhoneInvitationsByPhone(phoneNumber: string): Promise<PhoneInvitation[]> {
    return await db
      .select()
      .from(phoneInvitations)
      .where(eq(phoneInvitations.phoneNumber, phoneNumber))
      .orderBy(desc(phoneInvitations.createdAt));
  }

  async updatePhoneInvitation(id: number, updates: Partial<PhoneInvitation>): Promise<PhoneInvitation | undefined> {
    const [invitation] = await db
      .update(phoneInvitations)
      .set(updates)
      .where(eq(phoneInvitations.id, id))
      .returning();
    return invitation || undefined;
  }

  // Admin post operations
  async getAdminPosts(): Promise<AdminPost[]> {
    return await db
      .select()
      .from(adminPosts)
      .orderBy(desc(adminPosts.createdAt));
  }

  async getActiveAdminPosts(): Promise<AdminPost[]> {
    const now = new Date();
    return await db
      .select()
      .from(adminPosts)
      .where(
        and(
          eq(adminPosts.isActive, true),
          or(
            isNull(adminPosts.expiresAt),
            gt(adminPosts.expiresAt, now)
          )
        )
      )
      .orderBy(desc(adminPosts.createdAt));
  }

  async getAdminPost(id: number): Promise<AdminPost | undefined> {
    const [post] = await db
      .select()
      .from(adminPosts)
      .where(eq(adminPosts.id, id));
    return post || undefined;
  }

  async createAdminPost(post: InsertAdminPost & { createdBy: number }): Promise<AdminPost> {
    const [newPost] = await db
      .insert(adminPosts)
      .values(post)
      .returning();
    return newPost;
  }

  async updateAdminPost(id: number, updates: Partial<AdminPost>): Promise<AdminPost | undefined> {
    const [post] = await db
      .update(adminPosts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(adminPosts.id, id))
      .returning();
    return post || undefined;
  }

  async deleteAdminPost(id: number): Promise<boolean> {
    const result = await db
      .delete(adminPosts)
      .where(eq(adminPosts.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Advertisement operations
  async getAdvertisements(): Promise<Advertisement[]> {
    return await db
      .select()
      .from(advertisements)
      .orderBy(desc(advertisements.createdAt));
  }

  async getActiveAdvertisements(): Promise<Advertisement[]> {
    const now = new Date();
    return await db
      .select()
      .from(advertisements)
      .where(
        and(
          eq(advertisements.isActive, true),
          or(
            isNull(advertisements.startDate),
            lte(advertisements.startDate, now)
          ),
          or(
            isNull(advertisements.endDate),
            gt(advertisements.endDate, now)
          )
        )
      )
      .orderBy(desc(advertisements.createdAt));
  }

  async createAdvertisement(ad: InsertAdvertisement & { createdBy: number }): Promise<Advertisement> {
    // Handle empty date strings by converting them to null
    const processedAd = { ...ad } as any;
    if (processedAd.startDate === '') {
      processedAd.startDate = null;
    }
    if (processedAd.endDate === '') {
      processedAd.endDate = null;
    }
    
    const [newAd] = await db
      .insert(advertisements)
      .values(processedAd)
      .returning();
    return newAd;
  }

  async updateAdvertisement(id: number, updates: Partial<Advertisement>): Promise<Advertisement | undefined> {
    // Handle empty date strings by converting them to null
    const processedUpdates = { ...updates } as any;
    if (processedUpdates.startDate === '') {
      processedUpdates.startDate = null;
    }
    if (processedUpdates.endDate === '') {
      processedUpdates.endDate = null;
    }
    
    const [ad] = await db
      .update(advertisements)
      .set({ ...processedUpdates, updatedAt: new Date() })
      .where(eq(advertisements.id, id))
      .returning();
    return ad || undefined;
  }

  async deleteAdvertisement(id: number): Promise<boolean> {
    const result = await db
      .delete(advertisements)
      .where(eq(advertisements.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async incrementAdvertisementImpressions(id: number): Promise<void> {
    await db
      .update(advertisements)
      .set({ 
        currentImpressions: sql`${advertisements.currentImpressions} + 1`,
        updatedAt: new Date()
      })
      .where(eq(advertisements.id, id));
  }

  // Mood log operations
  async createMoodLog(moodLog: InsertMoodLog): Promise<MoodLog> {
    const [log] = await db
      .insert(moodLogs)
      .values(moodLog)
      .returning();
    return log;
  }

  async getUserMoodLogs(userId: number, limit?: number): Promise<MoodLog[]> {
    const query = db
      .select()
      .from(moodLogs)
      .where(eq(moodLogs.userId, userId))
      .orderBy(desc(moodLogs.loggedAt));
    
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }

  async getLatestMoodLog(userId: number): Promise<MoodLog | undefined> {
    const [log] = await db
      .select()
      .from(moodLogs)
      .where(eq(moodLogs.userId, userId))
      .orderBy(desc(moodLogs.loggedAt))
      .limit(1);
    return log || undefined;
  }

  async hasLoggedMoodToday(userId: number): Promise<boolean> {
    // Check if user should log mood (every 2 days, not on registration day)
    const user = await this.getUser(userId);
    if (!user) return true; // Don't show if user not found
    
    const userCreatedAt = user.createdAt ? new Date(user.createdAt) : new Date();
    const now = new Date();
    
    // Don't show on registration day
    const registrationDay = new Date(userCreatedAt);
    registrationDay.setHours(23, 59, 59, 999);
    if (now <= registrationDay) {
      return true; // Pretend they already logged to prevent showing
    }
    
    // Get latest mood log
    const latestLog = await this.getLatestMoodLog(userId);
    if (!latestLog) return false; // Never logged, should show
    
    // Check if it's been at least 2 days since last log
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(0, 0, 0, 0);
    
    return new Date(latestLog.loggedAt || new Date()) > twoDaysAgo; // True if logged within 2 days
  }










}