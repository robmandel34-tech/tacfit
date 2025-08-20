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
  isSuspended: boolean("is_suspended").default(false),
  suspendedAt: timestamp("suspended_at"),
  suspensionReason: text("suspension_reason"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  referredBy: integer("referred_by"),
  referralToken: text("referral_token"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  
  // Email verification fields
  isEmailVerified: boolean("is_email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationTokenExpiresAt: timestamp("email_verification_token_expires_at"),

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
  // Payment fields
  entryFee: integer("entry_fee").default(0), // Fee in cents (0 = free)
  paymentType: text("payment_type").default("free"), // "free", "one_time", "subscription"
  stripeProductId: text("stripe_product_id"), // Stripe product ID for paid competitions
  stripePriceId: text("stripe_price_id"), // Stripe price ID for paid competitions
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
  // Text input requirements
  requiresTextInput: boolean("requires_text_input").default(false),
  textInputDescription: text("text_input_description"), // What should be entered in the text box
  textInputMinWords: integer("text_input_min_words").default(50), // Minimum word count required
  // HealthKit integration requirement
  requiresHealthKit: boolean("requires_health_kit").default(false),
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
  evidenceUrl: text("evidence_url"), // Video URL (only one allowed)
  thumbnailUrl: text("thumbnail_url"), // Video thumbnail image URL
  imageUrls: text("image_urls").array().default([]), // Multiple image URLs
  textInput: text("text_input"), // Required text input for certain activity types
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

export const phoneInvitations = pgTable("phone_invitations", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  invitedBy: integer("invited_by").references(() => users.id),
  teamId: integer("team_id").references(() => teams.id),
  competitionId: integer("competition_id").references(() => competitions.id),
  inviteToken: text("invite_token").notNull().unique(),
  status: text("status").default("pending"), // pending, completed, expired
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const competitionEntries = pgTable("competition_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  competitionId: integer("competition_id").references(() => competitions.id),
  paymentType: text("payment_type").notNull(), // free, stripe, points
  paymentStatus: text("payment_status").default("pending"), // pending, completed, failed, refunded
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  pointsUsed: integer("points_used").default(0),
  amountPaid: integer("amount_paid").default(0), // Amount paid in cents
  createdAt: timestamp("created_at").defaultNow(),
  paymentMethod: text("payment_method"), // Additional method info
  refundedAt: timestamp("refunded_at"), // When refund was processed
  refundAmount: integer("refund_amount"), // Points refunded
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

export const adminPosts = pgTable("admin_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  postImageUrl: text("post_image_url"),
  type: text("type").default("announcement"), // announcement, alert, news, competition_update, maintenance, promotion
  priority: text("priority").default("medium"), // low, medium, high, urgent
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const advertisements = pgTable("advertisements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"), // Optional external link
  adType: text("ad_type").default("banner"), // banner, sponsored_post, video, carousel
  targetAudience: text("target_audience"), // all, premium_users, competition_participants
  isActive: boolean("is_active").default(true),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  maxImpressions: integer("max_impressions"), // Optional impression limit
  currentImpressions: integer("current_impressions").default(0),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const moodLogs = pgTable("mood_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  mood: text("mood").notNull(), // excellent, good, okay, stressed, down
  note: text("note"), // optional user note
  loggedAt: timestamp("logged_at").defaultNow(),
});

// Apple HealthKit Integration Tables
export const appleHealthConnections = pgTable("apple_health_connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  isEnabled: boolean("is_enabled").default(false),
  setupCompleted: boolean("setup_completed").default(false),
  healthKitAuthToken: text("healthkit_auth_token"), // Apple HealthKit authorization token
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  permissionsGranted: text("permissions_granted"), // JSON array of granted permission types
  deviceInfo: text("device_info"), // JSON with iPhone/Apple Watch model info
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const appleHealthData = pgTable("apple_health_data", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  dataType: text("data_type").notNull(), // steps, heart_rate, active_energy, sleep_analysis, etc.
  value: text("value").notNull(), // Stored as text to handle different data types
  unit: text("unit"), // steps, bpm, calories, miles, minutes
  sourceApp: text("source_app"), // Which app provided the data (Health, Fitness, etc.)
  deviceModel: text("device_model"), // iPhone 15, Apple Watch Series 9, etc.
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  metadata: text("metadata"), // JSON string for additional data
  healthKitSampleId: text("healthkit_sample_id"), // Unique HealthKit sample identifier
  syncedAt: timestamp("synced_at").defaultNow(),
});

export const appleHealthWorkouts = pgTable("apple_health_workouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  activityId: integer("activity_id").references(() => activities.id), // Link to TacFit activity if created
  workoutType: text("workout_type").notNull(), // HKWorkoutActivityType values
  duration: integer("duration"), // Duration in minutes
  totalEnergyBurned: integer("total_energy_burned"), // Calories
  totalDistance: text("total_distance"), // Distance with unit
  averageHeartRate: integer("average_heart_rate"), // BPM
  maxHeartRate: integer("max_heart_rate"), // BPM
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  sourceApp: text("source_app"),
  deviceModel: text("device_model"), // Apple Watch Series 9, iPhone 15, etc.
  metadata: text("metadata"), // JSON for additional workout data
  healthKitWorkoutId: text("healthkit_workout_id"), // Unique HealthKit workout identifier
  isConverted: boolean("is_converted").default(false), // Whether converted to TacFit activity
  // Route data fields
  routeData: text("route_data"), // JSON array of GPS coordinates
  routeMapUrl: text("route_map_url"), // Generated static map URL
  hasRoute: boolean("has_route").default(false), // Whether workout includes route data
  elevationGain: integer("elevation_gain"), // Total elevation gain in meters
  syncedAt: timestamp("synced_at").defaultNow(),
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

export const insertPhoneInvitationSchema = createInsertSchema(phoneInvitations).omit({
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

export const insertAdminPostSchema = createInsertSchema(adminPosts).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAdvertisementSchema = createInsertSchema(advertisements).omit({
  id: true,
  createdBy: true,
  currentImpressions: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMoodLogSchema = createInsertSchema(moodLogs).omit({
  id: true,
  loggedAt: true,
});

export const insertAppleHealthConnectionSchema = createInsertSchema(appleHealthConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAppleHealthDataSchema = createInsertSchema(appleHealthData).omit({
  id: true,
  syncedAt: true,
});

export const insertAppleHealthWorkoutSchema = createInsertSchema(appleHealthWorkouts).omit({
  id: true,
  syncedAt: true,
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
export type PhoneInvitation = typeof phoneInvitations.$inferSelect;
export type InsertPhoneInvitation = z.infer<typeof insertPhoneInvitationSchema>;
export type WhiteboardItem = typeof whiteboardItems.$inferSelect;
export type InsertWhiteboardItem = z.infer<typeof insertWhiteboardItemSchema>;
export type ActivityType = typeof activityTypes.$inferSelect;
export type InsertActivityType = z.infer<typeof insertActivityTypeSchema>;
export type MissionTask = typeof missionTasks.$inferSelect;
export type InsertMissionTask = z.infer<typeof insertMissionTaskSchema>;
export type AdminPost = typeof adminPosts.$inferSelect;
export type InsertAdminPost = z.infer<typeof insertAdminPostSchema>;
export type Advertisement = typeof advertisements.$inferSelect;
export type InsertAdvertisement = z.infer<typeof insertAdvertisementSchema>;
export type MoodLog = typeof moodLogs.$inferSelect;
export type InsertMoodLog = z.infer<typeof insertMoodLogSchema>;
export type AppleHealthConnection = typeof appleHealthConnections.$inferSelect;
export type InsertAppleHealthConnection = z.infer<typeof insertAppleHealthConnectionSchema>;
export type AppleHealthData = typeof appleHealthData.$inferSelect;
export type InsertAppleHealthData = z.infer<typeof insertAppleHealthDataSchema>;
export type AppleHealthWorkout = typeof appleHealthWorkouts.$inferSelect;
export type InsertAppleHealthWorkout = z.infer<typeof insertAppleHealthWorkoutSchema>;
