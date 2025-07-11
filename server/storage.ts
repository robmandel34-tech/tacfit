import { 
  User, InsertUser, Competition, InsertCompetition, Team, InsertTeam, 
  TeamMember, InsertTeamMember, Activity, InsertActivity, ActivityComment, 
  InsertActivityComment, ActivityLike, ChatMessage, InsertChatMessage, 
  Friendship, InsertFriendship, CompetitionHistory 
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // Competition operations
  getCompetitions(): Promise<Competition[]>;
  getCompetition(id: number): Promise<Competition | undefined>;
  createCompetition(competition: InsertCompetition): Promise<Competition>;
  updateCompetition(id: number, updates: Partial<Competition>): Promise<Competition | undefined>;
  
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
  
  // Chat operations
  getChatMessages(teamId?: number, competitionId?: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  
  // Friend operations
  getFriendships(userId: number): Promise<Friendship[]>;
  createFriendship(friendship: InsertFriendship): Promise<Friendship>;
  updateFriendship(id: number, status: string): Promise<Friendship | undefined>;
  
  // Competition history operations
  getCompetitionHistory(userId: number): Promise<CompetitionHistory[]>;
  createCompetitionHistory(history: Omit<CompetitionHistory, 'id'>): Promise<CompetitionHistory>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private competitions: Map<number, Competition> = new Map();
  private teams: Map<number, Team> = new Map();
  private teamMembers: Map<number, TeamMember> = new Map();
  private activities: Map<number, Activity> = new Map();
  private activityComments: Map<number, ActivityComment> = new Map();
  private activityLikes: Map<number, ActivityLike> = new Map();
  private chatMessages: Map<number, ChatMessage> = new Map();
  private friendships: Map<number, Friendship> = new Map();
  private competitionHistory: Map<number, CompetitionHistory> = new Map();
  
  private currentUserId = 1;
  private currentCompetitionId = 1;
  private currentTeamId = 1;
  private currentTeamMemberId = 1;
  private currentActivityId = 1;
  private currentActivityCommentId = 1;
  private currentActivityLikeId = 1;
  private currentChatMessageId = 1;
  private currentFriendshipId = 1;
  private currentCompetitionHistoryId = 1;

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: this.currentUserId++,
      points: 0,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Competition operations
  async getCompetitions(): Promise<Competition[]> {
    return Array.from(this.competitions.values());
  }

  async getCompetition(id: number): Promise<Competition | undefined> {
    return this.competitions.get(id);
  }

  async createCompetition(insertCompetition: InsertCompetition): Promise<Competition> {
    const competition: Competition = {
      ...insertCompetition,
      id: this.currentCompetitionId++,
      createdAt: new Date(),
    };
    this.competitions.set(competition.id, competition);
    return competition;
  }

  async updateCompetition(id: number, updates: Partial<Competition>): Promise<Competition | undefined> {
    const competition = this.competitions.get(id);
    if (!competition) return undefined;
    
    const updatedCompetition = { ...competition, ...updates };
    this.competitions.set(id, updatedCompetition);
    return updatedCompetition;
  }

  // Team operations
  async getTeams(): Promise<Team[]> {
    return Array.from(this.teams.values());
  }

  async getTeam(id: number): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async getTeamsByCompetition(competitionId: number): Promise<Team[]> {
    return Array.from(this.teams.values()).filter(team => team.competitionId === competitionId);
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const team: Team = {
      ...insertTeam,
      id: this.currentTeamId++,
      points: 0,
      createdAt: new Date(),
    };
    this.teams.set(team.id, team);
    return team;
  }

  async updateTeam(id: number, updates: Partial<Team>): Promise<Team | undefined> {
    const team = this.teams.get(id);
    if (!team) return undefined;
    
    const updatedTeam = { ...team, ...updates };
    this.teams.set(id, updatedTeam);
    return updatedTeam;
  }

  // Team member operations
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values()).filter(member => member.teamId === teamId);
  }

  async getTeamMember(teamId: number, userId: number): Promise<TeamMember | undefined> {
    return Array.from(this.teamMembers.values()).find(member => 
      member.teamId === teamId && member.userId === userId
    );
  }

  async getUserTeam(userId: number, competitionId: number): Promise<TeamMember | undefined> {
    const userTeamMember = Array.from(this.teamMembers.values()).find(member => 
      member.userId === userId
    );
    
    if (!userTeamMember) return undefined;
    
    const team = this.teams.get(userTeamMember.teamId!);
    if (!team || team.competitionId !== competitionId) return undefined;
    
    return userTeamMember;
  }

  async addTeamMember(insertMember: InsertTeamMember): Promise<TeamMember> {
    const member: TeamMember = {
      ...insertMember,
      id: this.currentTeamMemberId++,
      joinedAt: new Date(),
    };
    this.teamMembers.set(member.id, member);
    return member;
  }

  async removeTeamMember(teamId: number, userId: number): Promise<boolean> {
    const member = Array.from(this.teamMembers.values()).find(member => 
      member.teamId === teamId && member.userId === userId
    );
    
    if (!member) return false;
    
    this.teamMembers.delete(member.id);
    return true;
  }

  // Activity operations
  async getActivities(): Promise<Activity[]> {
    return Array.from(this.activities.values());
  }

  async getActivity(id: number): Promise<Activity | undefined> {
    return this.activities.get(id);
  }

  async getActivitiesByCompetition(competitionId: number): Promise<Activity[]> {
    return Array.from(this.activities.values()).filter(activity => 
      activity.competitionId === competitionId
    );
  }

  async getActivitiesByTeam(teamId: number): Promise<Activity[]> {
    return Array.from(this.activities.values()).filter(activity => 
      activity.teamId === teamId
    );
  }

  async getActivitiesByUser(userId: number): Promise<Activity[]> {
    return Array.from(this.activities.values()).filter(activity => 
      activity.userId === userId
    );
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const activity: Activity = {
      ...insertActivity,
      id: this.currentActivityId++,
      points: 10,
      isFlagged: false,
      createdAt: new Date(),
    };
    this.activities.set(activity.id, activity);
    return activity;
  }

  async updateActivity(id: number, updates: Partial<Activity>): Promise<Activity | undefined> {
    const activity = this.activities.get(id);
    if (!activity) return undefined;
    
    const updatedActivity = { ...activity, ...updates };
    this.activities.set(id, updatedActivity);
    return updatedActivity;
  }

  // Activity comment operations
  async getActivityComments(activityId: number): Promise<ActivityComment[]> {
    return Array.from(this.activityComments.values()).filter(comment => 
      comment.activityId === activityId
    );
  }

  async createActivityComment(insertComment: InsertActivityComment): Promise<ActivityComment> {
    const comment: ActivityComment = {
      ...insertComment,
      id: this.currentActivityCommentId++,
      createdAt: new Date(),
    };
    this.activityComments.set(comment.id, comment);
    return comment;
  }

  // Activity like operations
  async getActivityLikes(activityId: number): Promise<ActivityLike[]> {
    return Array.from(this.activityLikes.values()).filter(like => 
      like.activityId === activityId
    );
  }

  async toggleActivityLike(activityId: number, userId: number): Promise<boolean> {
    const existingLike = Array.from(this.activityLikes.values()).find(like => 
      like.activityId === activityId && like.userId === userId
    );
    
    if (existingLike) {
      this.activityLikes.delete(existingLike.id);
      return false;
    } else {
      const like: ActivityLike = {
        id: this.currentActivityLikeId++,
        activityId,
        userId,
        createdAt: new Date(),
      };
      this.activityLikes.set(like.id, like);
      return true;
    }
  }

  // Chat operations
  async getChatMessages(teamId?: number, competitionId?: number): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values()).filter(message => {
      if (teamId && message.teamId === teamId) return true;
      if (competitionId && message.competitionId === competitionId && message.type === 'competition') return true;
      return false;
    });
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const message: ChatMessage = {
      ...insertMessage,
      id: this.currentChatMessageId++,
      createdAt: new Date(),
    };
    this.chatMessages.set(message.id, message);
    return message;
  }

  // Friend operations
  async getFriendships(userId: number): Promise<Friendship[]> {
    return Array.from(this.friendships.values()).filter(friendship => 
      friendship.userId === userId || friendship.friendId === userId
    );
  }

  async createFriendship(insertFriendship: InsertFriendship): Promise<Friendship> {
    const friendship: Friendship = {
      ...insertFriendship,
      id: this.currentFriendshipId++,
      createdAt: new Date(),
    };
    this.friendships.set(friendship.id, friendship);
    return friendship;
  }

  async updateFriendship(id: number, status: string): Promise<Friendship | undefined> {
    const friendship = this.friendships.get(id);
    if (!friendship) return undefined;
    
    const updatedFriendship = { ...friendship, status };
    this.friendships.set(id, updatedFriendship);
    return updatedFriendship;
  }

  // Competition history operations
  async getCompetitionHistory(userId: number): Promise<CompetitionHistory[]> {
    return Array.from(this.competitionHistory.values()).filter(history => 
      history.userId === userId
    );
  }

  async createCompetitionHistory(insertHistory: Omit<CompetitionHistory, 'id'>): Promise<CompetitionHistory> {
    const history: CompetitionHistory = {
      ...insertHistory,
      id: this.currentCompetitionHistoryId++,
    };
    this.competitionHistory.set(history.id, history);
    return history;
  }
}

export const storage = new MemStorage();
