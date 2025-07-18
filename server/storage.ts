import { 
  User, InsertUser, Competition, InsertCompetition, Team, InsertTeam, 
  TeamMember, InsertTeamMember, Activity, InsertActivity, ActivityComment, 
  InsertActivityComment, ActivityLike, ChatMessage, InsertChatMessage, 
  Friendship, InsertFriendship, CompetitionHistory, CompetitionInvitation,
  InsertCompetitionInvitation, CompetitionEntry, InsertCompetitionEntry,
  WhiteboardItem, InsertWhiteboardItem, MissionTask, InsertMissionTask,
  ActivityType, InsertActivityType
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
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
  
  // Team member operations
  getTeamMembers(teamId: number): Promise<TeamMember[]>;
  getTeamMember(teamId: number, userId: number): Promise<TeamMember | undefined>;
  getUserTeam(userId: number, competitionId: number): Promise<TeamMember | undefined>;
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  removeTeamMember(teamId: number, userId: number): Promise<boolean>;
  
  // Activity operations
  getActivities(): Promise<Activity[]>;
  getActivity(id: number): Promise<Activity | undefined>;
  getActivitiesByCompetition(competitionId: number): Promise<Activity[]>;
  getActivitiesByTeam(teamId: number): Promise<Activity[]>;
  getActivitiesByUser(userId: number): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: number, updates: Partial<Activity>): Promise<Activity | undefined>;
  
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
  
  // Friend operations
  getFriendships(userId: number): Promise<Friendship[]>;
  createFriendship(friendship: InsertFriendship): Promise<Friendship>;
  updateFriendship(id: number, status: string): Promise<Friendship | undefined>;
  
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
  getUserCompetitionEntries(userId: number): Promise<CompetitionEntry[]>;
  
  // Whiteboard operations
  getWhiteboardItems(teamId: number): Promise<WhiteboardItem[]>;
  createWhiteboardItem(insertItem: InsertWhiteboardItem): Promise<WhiteboardItem>;
  updateWhiteboardItemPosition(id: number, positionX: number, positionY: number): Promise<WhiteboardItem | undefined>;
  updateWhiteboardItemStatus(id: number, status: string): Promise<WhiteboardItem | undefined>;
  deleteWhiteboardItem(id: number): Promise<boolean>;
  
  // Mission task operations
  getMissionTasks(teamId: number): Promise<MissionTask[]>;
  createMissionTask(insertTask: InsertMissionTask): Promise<MissionTask>;
  updateMissionTask(id: string, updates: Partial<MissionTask>): Promise<MissionTask | undefined>;
  deleteMissionTask(id: string): Promise<boolean>;
}

import { DatabaseStorage } from "./database-storage";
export const storage = new DatabaseStorage();