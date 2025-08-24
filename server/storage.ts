import { 
  User, InsertUser, Competition, InsertCompetition, Team, InsertTeam, 
  TeamMember, InsertTeamMember, Activity, InsertActivity, ActivityComment, 
  InsertActivityComment, ActivityLike, ActivityFlag, ChatMessage, InsertChatMessage, 
  Friendship, InsertFriendship, CompetitionHistory, CompetitionInvitation,
  InsertCompetitionInvitation, CompetitionEntry, InsertCompetitionEntry,
  PhoneInvitation, InsertPhoneInvitation, WhiteboardItem, InsertWhiteboardItem, 
  MissionTask, InsertMissionTask, ActivityType, InsertActivityType,
  AdminPost, InsertAdminPost, MoodLog, InsertMoodLog,
  AppleHealthConnection, InsertAppleHealthConnection,
  AppleHealthData, InsertAppleHealthData,
  AppleHealthWorkout, InsertAppleHealthWorkout
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmailVerificationToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // Competition operations
  getCompetitions(): Promise<Competition[]>;
  getCompetition(id: number): Promise<Competition | undefined>;
  createCompetition(competition: InsertCompetition): Promise<Competition>;
  updateCompetition(id: number, updates: Partial<Competition>): Promise<Competition | undefined>;
  deleteCompetition(id: number): Promise<boolean>;
  
  // Team operations
  getTeams(): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  getTeamsByCompetition(competitionId: number): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, updates: Partial<Team>): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<boolean>;
  updateActivitiesTeamId(oldTeamId: number, newTeamId: number | null): Promise<boolean>;
  
  // Team member operations
  getTeamMembers(teamId: number): Promise<TeamMember[]>;
  getTeamMembersByUser(userId: number): Promise<TeamMember[]>;
  getTeamMember(teamId: number, userId: number): Promise<TeamMember | undefined>;
  getTeamMemberByUserAndTeam(userId: number, teamId: number): Promise<TeamMember | undefined>;
  getUserTeam(userId: number, competitionId: number): Promise<TeamMember | undefined>;
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(teamId: number, userId: number, updates: Partial<TeamMember>): Promise<TeamMember | undefined>;
  removeTeamMember(teamId: number, userId: number): Promise<boolean>;
  
  // Activity operations
  getActivities(): Promise<Activity[]>;
  getActivity(id: number): Promise<Activity | undefined>;
  getActivitiesByCompetition(competitionId: number): Promise<Activity[]>;
  getActivitiesByTeam(teamId: number): Promise<Activity[]>;
  getActivitiesByUser(userId: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: number, updates: Partial<Activity>): Promise<Activity | undefined>;
  deleteActivity(id: number): Promise<boolean>;
  
  // Activity comment operations
  getActivityComments(activityId: number): Promise<ActivityComment[]>;
  createActivityComment(comment: InsertActivityComment): Promise<ActivityComment>;
  
  // Activity like operations
  getActivityLikes(activityId: number): Promise<ActivityLike[]>;
  toggleActivityLike(activityId: number, userId: number): Promise<boolean>;
  
  // Activity flag operations
  getActivityFlags(activityId: number): Promise<ActivityFlag[]>;
  toggleActivityFlag(activityId: number, userId: number): Promise<boolean>;
  
  // Activity type operations
  getActivityTypes(): Promise<ActivityType[]>;
  getActivityType(id: number): Promise<ActivityType | undefined>;
  createActivityType(activityType: InsertActivityType): Promise<ActivityType>;
  updateActivityType(id: number, updates: Partial<ActivityType>): Promise<ActivityType | undefined>;
  deleteActivityType(id: number): Promise<boolean>;
  
  // Chat operations
  getChatMessages(teamId?: number, competitionId?: number): Promise<ChatMessage[]>;
  getDirectMessages(userId1: number, userId2: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getUserConversations(userId: number): Promise<Array<{
    friendId: number;
    friend: { id: number; username: string; avatar?: string | null };
    lastMessage: ChatMessage | null;
    unreadCount: number;
  }>>;
  markMessageAsRead(messageId: number): Promise<void>;
  markConversationAsRead(userId: number, friendId: number): Promise<void>;
  
  // Friend operations
  getFriendships(userId: number): Promise<Friendship[]>;
  createFriendship(friendship: InsertFriendship): Promise<Friendship>;
  updateFriendship(id: number, status: string): Promise<Friendship | undefined>;
  deleteFriendship(id: number): Promise<boolean>;
  
  // Competition history operations
  getCompetitionHistory(userId: number): Promise<CompetitionHistory[]>;
  createCompetitionHistory(history: Omit<CompetitionHistory, 'id'>): Promise<CompetitionHistory>;
  
  // Competition invitation operations
  createCompetitionInvitation(invitation: InsertCompetitionInvitation): Promise<CompetitionInvitation>;
  getCompetitionInvitation(token: string): Promise<CompetitionInvitation | undefined>;
  updateCompetitionInvitation(id: number, updates: Partial<CompetitionInvitation>): Promise<CompetitionInvitation | undefined>;
  getCompetitionInvitationsByUser(userId: number): Promise<CompetitionInvitation[]>;
  
  // Competition entry operations
  createCompetitionEntry(entry: InsertCompetitionEntry): Promise<CompetitionEntry>;
  getCompetitionEntry(userId: number, competitionId: number): Promise<CompetitionEntry | undefined>;
  updateCompetitionEntry(id: number, updates: Partial<CompetitionEntry>): Promise<CompetitionEntry | undefined>;
  deleteCompetitionEntry(id: number): Promise<boolean>;
  getUserCompetitionEntries(userId: number): Promise<CompetitionEntry[]>;
  
  // Whiteboard operations
  getWhiteboardItems(teamId: number): Promise<WhiteboardItem[]>;
  createWhiteboardItem(insertItem: InsertWhiteboardItem): Promise<WhiteboardItem>;
  updateWhiteboardItemPosition(id: number, positionX: number, positionY: number): Promise<WhiteboardItem | undefined>;
  updateWhiteboardItemStatus(id: number, status: string): Promise<WhiteboardItem | undefined>;
  deleteWhiteboardItem(id: number): Promise<boolean>;
  
  // Mission task operations
  getMissionTasks(teamId: number): Promise<MissionTask[]>;
  getUserPendingTasks(userId: number): Promise<MissionTask[]>;
  createMissionTask(insertTask: InsertMissionTask): Promise<MissionTask>;
  updateMissionTask(id: string, updates: Partial<MissionTask>): Promise<MissionTask | undefined>;
  deleteMissionTask(id: string): Promise<boolean>;
  
  // Team invitation operations
  createInvitation(invitation: any): Promise<any>;
  createUserInvitation(invitation: any): Promise<any>;
  
  // Phone invitation operations
  createPhoneInvitation(invitation: InsertPhoneInvitation): Promise<PhoneInvitation>;
  getPhoneInvitationByToken(token: string): Promise<PhoneInvitation | undefined>;
  getPhoneInvitationsByPhone(phoneNumber: string): Promise<PhoneInvitation[]>;
  updatePhoneInvitation(id: number, updates: Partial<PhoneInvitation>): Promise<PhoneInvitation | undefined>;
  
  // Admin post operations
  getAdminPosts(): Promise<AdminPost[]>;
  getActiveAdminPosts(): Promise<AdminPost[]>;
  getAdminPost(id: number): Promise<AdminPost | undefined>;
  createAdminPost(post: InsertAdminPost): Promise<AdminPost>;
  updateAdminPost(id: number, updates: Partial<AdminPost>): Promise<AdminPost | undefined>;
  deleteAdminPost(id: number): Promise<boolean>;
  
  // Mood log operations
  createMoodLog(moodLog: InsertMoodLog): Promise<MoodLog>;
  getUserMoodLogs(userId: number, limit?: number): Promise<MoodLog[]>;
  getLatestMoodLog(userId: number): Promise<MoodLog | undefined>;
  hasLoggedMoodToday(userId: number): Promise<boolean>;
  
  // Apple Health integration operations
  getAppleHealthConnection(userId: number): Promise<AppleHealthConnection | undefined>;
  createOrUpdateAppleHealthConnection(userId: number, updates: Partial<AppleHealthConnection>): Promise<AppleHealthConnection>;
  updateAppleHealthConnection(userId: number, updates: Partial<AppleHealthConnection>): Promise<AppleHealthConnection | undefined>;
  createAppleHealthData(data: InsertAppleHealthData): Promise<AppleHealthData>;
  getAppleHealthData(userId: number, dataType?: string, startDate?: string, endDate?: string, limit?: number): Promise<AppleHealthData[]>;
  createAppleHealthWorkout(workout: InsertAppleHealthWorkout): Promise<AppleHealthWorkout>;
  getAppleHealthWorkouts(userId: number, startDate?: string, endDate?: string, limit?: number): Promise<AppleHealthWorkout[]>;
  getAppleHealthWorkout(id: number): Promise<AppleHealthWorkout | undefined>;
  getAppleHealthWorkoutByHealthKitId(userId: number, healthKitWorkoutId: string): Promise<AppleHealthWorkout | undefined>;
  updateAppleHealthWorkout(id: number, updates: Partial<AppleHealthWorkout>): Promise<AppleHealthWorkout | undefined>;
}

import { DatabaseStorage } from "./database-storage";
export const storage = new DatabaseStorage();