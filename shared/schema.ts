import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  points: integer("points").default(0),
  avatar: text("avatar"),
  coverPhoto: text("cover_photo"),
  motto: text("motto"),
  competitionsEntered: integer("competitions_entered").default(0),
  isAdmin: boolean("is_admin").default(false),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const competitions = pgTable("competitions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  joinStartDate: timestamp("join_start_date"),
  joinEndDate: timestamp("join_end_date"),
  maxTeams: integer("max_teams").default(10),
  createdBy: integer("created_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  requiredActivities: text("required_activities").array().default([]),
  targetGoals: text("target_goals").array().default([]),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  competitionId: integer("competition_id").references(() => competitions.id),
  captainId: integer("captain_id").references(() => users.id),
  points: integer("points").default(0),
  motto: text("motto"),
  pictureUrl: text("picture_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id),
  userId: integer("user_id").references(() => users.id),
  role: text("role").default("member"), // captain, member
  joinedAt: timestamp("joined_at").defaultNow(),
});

export const activityTypes = pgTable("activity_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description"),
  measurementUnit: text("measurement_unit").notNull(), // minutes, reps, miles, etc.
  defaultQuantity: integer("default_quantity").default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  competitionId: integer("competition_id").references(() => competitions.id),
  teamId: integer("team_id").references(() => teams.id),
  type: text("type").notNull(), // cardio, strength, flexibility, sports, other
  description: text("description").notNull(),
  quantity: text("quantity"),
  evidenceType: text("evidence_type"), // photo, screenshot, text
  evidenceUrl: text("evidence_url"),
  imageUrl: text("image_url"), // Additional image URL for dual media support
  points: integer("points").default(10),
  isFlagged: boolean("is_flagged").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityComments = pgTable("activity_comments", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").references(() => activities.id),
  userId: integer("user_id").references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityLikes = pgTable("activity_likes", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").references(() => activities.id),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityFlags = pgTable("activity_flags", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").references(() => activities.id),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id),
  receiverId: integer("receiver_id").references(() => users.id), // For direct messages
  teamId: integer("team_id").references(() => teams.id),
  competitionId: integer("competition_id").references(() => competitions.id),
  content: text("content").notNull(),
  type: text("type").default("team"), // team, competition, direct
  createdAt: timestamp("created_at").defaultNow(),
});

export const friendships = pgTable("friendships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  friendId: integer("friend_id").references(() => users.id),
  status: text("status").default("pending"), // pending, accepted, declined
  createdAt: timestamp("created_at").defaultNow(),
});

export const competitionHistory = pgTable("competition_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  competitionId: integer("competition_id").references(() => competitions.id),
  teamId: integer("team_id").references(() => teams.id),
  finalRank: integer("final_rank"),
  pointsEarned: integer("points_earned").default(0),
  completedAt: timestamp("completed_at").defaultNow(),
});

export const competitionInvitations = pgTable("competition_invitations", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").references(() => competitions.id),
  invitedBy: integer("invited_by").references(() => users.id),
  phoneNumber: text("phone_number").notNull(),
  inviteToken: text("invite_token").notNull().unique(),
  status: text("status").default("pending"), // pending, accepted, expired
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const competitionEntries = pgTable("competition_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  competitionId: integer("competition_id").references(() => competitions.id),
  paymentType: text("payment_type").notNull(), // free, stripe, points
  paymentStatus: text("payment_status").default("pending"), // pending, completed, failed
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  pointsUsed: integer("points_used").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  paymentMethod: text("payment_method"), // Additional method info
});

export const whiteboardItems = pgTable("whiteboard_items", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id),
  type: text("type").notNull(), // note, task, goal, strategy
  title: text("title").notNull(),
  description: text("description"),
  priority: text("priority").default("medium"), // high, medium, low
  status: text("status").default("todo"), // todo, in_progress, completed
  assignedTo: integer("assigned_to").references(() => users.id),
  dueDate: timestamp("due_date"),
  positionX: integer("position_x").default(0),
  positionY: integer("position_y").default(0),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const missionTasks = pgTable("mission_tasks", {
  id: text("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  assignedTo: text("assigned_to").notNull(),
  assignedToUsername: text("assigned_to_username").notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'in-progress', 'completed'
  dueDate: timestamp("due_date"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCompetitionSchema = createInsertSchema(competitions).omit({
  id: true,
  createdAt: true,
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertActivityTypeSchema = createInsertSchema(activityTypes).omit({
  id: true,
  createdAt: true,
});

export const insertActivityCommentSchema = createInsertSchema(activityComments).omit({
  id: true,
  createdAt: true,
});

export const insertActivityFlagSchema = createInsertSchema(activityFlags).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertFriendshipSchema = createInsertSchema(friendships).omit({
  id: true,
  createdAt: true,
});

export const insertCompetitionInvitationSchema = createInsertSchema(competitionInvitations).omit({
  id: true,
  createdAt: true,
});

export const insertCompetitionEntrySchema = createInsertSchema(competitionEntries).omit({
  id: true,
  createdAt: true,
});

export const insertWhiteboardItemSchema = createInsertSchema(whiteboardItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMissionTaskSchema = createInsertSchema(missionTasks).omit({
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Competition = typeof competitions.$inferSelect;
export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type ActivityComment = typeof activityComments.$inferSelect;
export type InsertActivityComment = z.infer<typeof insertActivityCommentSchema>;
export type ActivityLike = typeof activityLikes.$inferSelect;
export type ActivityFlag = typeof activityFlags.$inferSelect;
export type InsertActivityFlag = z.infer<typeof insertActivityFlagSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;
export type CompetitionHistory = typeof competitionHistory.$inferSelect;
export type CompetitionInvitation = typeof competitionInvitations.$inferSelect;
export type InsertCompetitionInvitation = z.infer<typeof insertCompetitionInvitationSchema>;
export type CompetitionEntry = typeof competitionEntries.$inferSelect;
export type InsertCompetitionEntry = z.infer<typeof insertCompetitionEntrySchema>;
export type WhiteboardItem = typeof whiteboardItems.$inferSelect;
export type InsertWhiteboardItem = z.infer<typeof insertWhiteboardItemSchema>;
export type ActivityType = typeof activityTypes.$inferSelect;
export type InsertActivityType = z.infer<typeof insertActivityTypeSchema>;
export type MissionTask = typeof missionTasks.$inferSelect;
export type InsertMissionTask = z.infer<typeof insertMissionTaskSchema>;
