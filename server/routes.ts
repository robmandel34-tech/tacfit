import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertCompetitionSchema, insertTeamSchema, 
  insertTeamMemberSchema, insertActivitySchema, insertActivityCommentSchema,
  insertChatMessageSchema, insertFriendshipSchema, insertCompetitionInvitationSchema,
  insertCompetitionEntrySchema
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Create uploads directory if it doesn't exist
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
  }

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }
      
      const user = await storage.createUser(userData);
      
      // Don't send password back
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Don't send password back
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const updates = req.body;
      const user = await storage.updateUser(parseInt(req.params.id), updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error updating user" });
    }
  });

  // Competition routes
  app.get("/api/competitions", async (req, res) => {
    try {
      const competitions = await storage.getCompetitions();
      res.json(competitions);
    } catch (error) {
      res.status(500).json({ message: "Error fetching competitions" });
    }
  });

  app.get("/api/competitions/:id", async (req, res) => {
    try {
      const competition = await storage.getCompetition(parseInt(req.params.id));
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }
      res.json(competition);
    } catch (error) {
      res.status(500).json({ message: "Error fetching competition" });
    }
  });

  app.post("/api/competitions", async (req, res) => {
    try {
      const { createdBy, ...competitionData } = req.body;
      
      if (!createdBy) {
        return res.status(401).json({ message: "User ID required" });
      }

      // Get user to check points
      const user = await storage.getUser(createdBy);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user has enough points to create a competition (1000 points threshold)
      if ((user.points || 0) < 1000) {
        return res.status(403).json({ message: "Need at least 1000 points to create a competition" });
      }

      const parsedData = insertCompetitionSchema.parse(competitionData);
      const competition = await storage.createCompetition({
        ...parsedData,
        createdBy: user.id
      });
      res.json(competition);
    } catch (error) {
      res.status(400).json({ message: "Invalid competition data" });
    }
  });

  // Join competition endpoint
  app.post("/api/competitions/:id/join", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.id);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user is already in a competition
      const existingMembership = await storage.getUserTeam(userId, competitionId);
      if (existingMembership) {
        return res.status(400).json({ message: "User already in this competition" });
      }

      // Get competition
      const competition = await storage.getCompetition(competitionId);
      if (!competition || !competition.isActive) {
        return res.status(400).json({ message: "Competition not available" });
      }

      // Check if user has enough points or if it's their first competition
      if ((user.competitionsEntered || 0) > 0 && (user.points || 0) < 1000) {
        return res.status(403).json({ message: "Need at least 1000 points to join additional competitions" });
      }

      // Get existing teams for the competition
      const existingTeams = await storage.getTeamsByCompetition(competitionId);
      let targetTeam = null;

      // Find a team with less than 5 members
      for (const team of existingTeams) {
        const members = await storage.getTeamMembers(team.id);
        if (members.length < 5) {
          targetTeam = team;
          break;
        }
      }

      // If no team has space, create a new team
      if (!targetTeam) {
        if (existingTeams.length >= (competition.maxTeams || 10)) {
          return res.status(400).json({ message: "Competition is full" });
        }

        const teamNames = [
          "Alpha Squad", "Bravo Team", "Charlie Unit", "Delta Force", 
          "Echo Battalion", "Foxtrot Division", "Golf Company", "Hotel Platoon",
          "India Squad", "Juliet Team"
        ];
        const availableNames = teamNames.filter(name => 
          !existingTeams.some(team => team.name === name)
        );
        
        const teamName = availableNames[Math.floor(Math.random() * availableNames.length)] || 
                        `Team ${existingTeams.length + 1}`;

        targetTeam = await storage.createTeam({
          name: teamName,
          competitionId: competitionId,
          captainId: userId,
          points: 0,
          motto: "Ready for Action"
        });
      }

      // Add user to team
      await storage.addTeamMember({
        teamId: targetTeam.id,
        userId: userId,
        role: targetTeam.captainId === userId ? "captain" : "member"
      });

      // Update user's competition count
      await storage.updateUser(userId, {
        competitionsEntered: (user.competitionsEntered || 0) + 1
      });

      res.json({ 
        message: "Successfully joined competition", 
        team: targetTeam 
      });
    } catch (error) {
      console.error("Error joining competition:", error);
      res.status(500).json({ message: "Error joining competition" });
    }
  });

  // Team routes
  app.get("/api/teams", async (req, res) => {
    try {
      const competitionId = req.query.competitionId as string;
      if (competitionId) {
        const teams = await storage.getTeamsByCompetition(parseInt(competitionId));
        res.json(teams);
      } else {
        const teams = await storage.getTeams();
        res.json(teams);
      }
    } catch (error) {
      res.status(500).json({ message: "Error fetching teams" });
    }
  });

  app.get("/api/teams/:id", async (req, res) => {
    try {
      const team = await storage.getTeam(parseInt(req.params.id));
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.json(team);
    } catch (error) {
      res.status(500).json({ message: "Error fetching team" });
    }
  });

  app.post("/api/teams", async (req, res) => {
    try {
      const teamData = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(teamData);
      
      // Add creator as captain
      await storage.addTeamMember({
        teamId: team.id,
        userId: team.captainId!,
        role: "captain"
      });
      
      res.json(team);
    } catch (error) {
      res.status(400).json({ message: "Invalid team data" });
    }
  });

  // Get teams by competition
  app.get("/api/teams/competition/:competitionId", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.competitionId);
      const teams = await storage.getTeamsByCompetition(competitionId);
      res.json(teams);
    } catch (error) {
      res.status(500).json({ message: "Error fetching teams" });
    }
  });

  // Team member routes
  app.get("/api/teams/:id/members", async (req, res) => {
    try {
      const members = await storage.getTeamMembers(parseInt(req.params.id));
      
      // Get user details for each member
      const membersWithUsers = await Promise.all(
        members.map(async (member) => {
          const user = await storage.getUser(member.userId!);
          return {
            ...member,
            user: user ? { id: user.id, username: user.username, avatar: user.avatar, points: user.points } : null
          };
        })
      );
      
      res.json(membersWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching team members" });
    }
  });

  // Get team members by team ID
  app.get("/api/team-members/team/:teamId", async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const members = await storage.getTeamMembers(teamId);
      
      // Get user details for each member
      const membersWithUsers = await Promise.all(
        members.map(async (member) => {
          const user = await storage.getUser(member.userId!);
          return {
            ...member,
            user: user ? { id: user.id, username: user.username, avatar: user.avatar, points: user.points } : null
          };
        })
      );
      
      res.json(membersWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching team members" });
    }
  });

  app.post("/api/teams/:id/members", async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const memberData = insertTeamMemberSchema.parse(req.body);
      
      // Check if team has space (max 5 members)
      const currentMembers = await storage.getTeamMembers(teamId);
      if (currentMembers.length >= 5) {
        return res.status(400).json({ message: "Team is full" });
      }
      
      // Check if user is already on a team for this competition
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      const existingMember = await storage.getUserTeam(memberData.userId!, team.competitionId!);
      if (existingMember) {
        return res.status(400).json({ message: "User already on a team for this competition" });
      }
      
      const member = await storage.addTeamMember({
        ...memberData,
        teamId
      });
      
      res.json(member);
    } catch (error) {
      res.status(400).json({ message: "Invalid member data" });
    }
  });

  // Get user team memberships
  app.get("/api/team-members/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const teams = await storage.getTeams();
      const userMemberships = [];
      
      for (const team of teams) {
        const member = await storage.getTeamMember(team.id, userId);
        if (member) {
          userMemberships.push({
            ...member,
            team: team
          });
        }
      }
      
      res.json(userMemberships);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user memberships" });
    }
  });

  app.delete("/api/teams/:teamId/members/:userId", async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const userId = parseInt(req.params.userId);
      
      const success = await storage.removeTeamMember(teamId, userId);
      if (!success) {
        return res.status(404).json({ message: "Team member not found" });
      }
      
      res.json({ message: "Member removed from team" });
    } catch (error) {
      res.status(500).json({ message: "Error removing team member" });
    }
  });

  // Activity routes
  app.get("/api/activities", async (req, res) => {
    try {
      const competitionId = req.query.competitionId as string;
      const teamId = req.query.teamId as string;
      const userId = req.query.userId as string;
      
      let activities;
      if (competitionId) {
        activities = await storage.getActivitiesByCompetition(parseInt(competitionId));
      } else if (teamId) {
        activities = await storage.getActivitiesByTeam(parseInt(teamId));
      } else if (userId) {
        activities = await storage.getActivitiesByUser(parseInt(userId));
      } else {
        activities = await storage.getActivities();
      }
      
      // Get user details for each activity
      const activitiesWithUsers = await Promise.all(
        activities.map(async (activity) => {
          const user = await storage.getUser(activity.userId!);
          const likes = await storage.getActivityLikes(activity.id);
          const comments = await storage.getActivityComments(activity.id);
          
          return {
            ...activity,
            user: user ? { id: user.id, username: user.username, avatar: user.avatar } : null,
            likesCount: likes.length,
            commentsCount: comments.length
          };
        })
      );
      
      res.json(activitiesWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching activities" });
    }
  });

  // Get activities by competition ID
  app.get("/api/activities/competition/:competitionId", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.competitionId);
      const activities = await storage.getActivitiesByCompetition(competitionId);
      
      // Get user details for each activity
      const activitiesWithUsers = await Promise.all(
        activities.map(async (activity) => {
          const user = await storage.getUser(activity.userId!);
          const likes = await storage.getActivityLikes(activity.id);
          const comments = await storage.getActivityComments(activity.id);
          
          return {
            ...activity,
            user: user ? { id: user.id, username: user.username, avatar: user.avatar } : null,
            likesCount: likes.length,
            commentsCount: comments.length
          };
        })
      );
      
      res.json(activitiesWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching activities" });
    }
  });

  // Get activities by team ID
  app.get("/api/activities/team/:teamId", async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const activities = await storage.getActivitiesByTeam(teamId);
      
      // Get user details for each activity
      const activitiesWithUsers = await Promise.all(
        activities.map(async (activity) => {
          const user = await storage.getUser(activity.userId!);
          const likes = await storage.getActivityLikes(activity.id);
          const comments = await storage.getActivityComments(activity.id);
          
          return {
            ...activity,
            user: user ? { id: user.id, username: user.username, avatar: user.avatar } : null,
            likesCount: likes.length,
            commentsCount: comments.length
          };
        })
      );
      
      res.json(activitiesWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching activities" });
    }
  });

  app.post("/api/activities", upload.single('evidence'), async (req, res) => {
    try {
      const activityData = insertActivitySchema.parse(req.body);
      
      // Handle file upload
      if (req.file) {
        const fileExtension = path.extname(req.file.originalname);
        const fileName = `${Date.now()}${fileExtension}`;
        const filePath = path.join('uploads', fileName);
        
        fs.renameSync(req.file.path, filePath);
        activityData.evidenceUrl = `/uploads/${fileName}`;
        activityData.evidenceType = 'photo';
      }
      
      const activity = await storage.createActivity(activityData);
      
      // Update user and team points
      await storage.updateUser(activity.userId!, { 
        points: (await storage.getUser(activity.userId!))!.points! + activity.points! 
      });
      
      if (activity.teamId) {
        const team = await storage.getTeam(activity.teamId);
        if (team) {
          await storage.updateTeam(activity.teamId, {
            points: team.points! + activity.points!
          });
        }
      }
      
      res.json(activity);
    } catch (error) {
      res.status(400).json({ message: "Invalid activity data" });
    }
  });

  app.put("/api/activities/:id", async (req, res) => {
    try {
      const updates = req.body;
      const activity = await storage.updateActivity(parseInt(req.params.id), updates);
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }
      res.json(activity);
    } catch (error) {
      res.status(500).json({ message: "Error updating activity" });
    }
  });

  // Activity comment routes
  app.get("/api/activities/:id/comments", async (req, res) => {
    try {
      const comments = await storage.getActivityComments(parseInt(req.params.id));
      
      // Get user details for each comment
      const commentsWithUsers = await Promise.all(
        comments.map(async (comment) => {
          const user = await storage.getUser(comment.userId!);
          return {
            ...comment,
            user: user ? { id: user.id, username: user.username, avatar: user.avatar } : null
          };
        })
      );
      
      res.json(commentsWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching comments" });
    }
  });

  app.post("/api/activities/:id/comments", async (req, res) => {
    try {
      const commentData = insertActivityCommentSchema.parse({
        ...req.body,
        activityId: parseInt(req.params.id)
      });
      
      const comment = await storage.createActivityComment(commentData);
      res.json(comment);
    } catch (error) {
      res.status(400).json({ message: "Invalid comment data" });
    }
  });

  // Activity like routes
  app.post("/api/activities/:id/like", async (req, res) => {
    try {
      const { userId } = req.body;
      const liked = await storage.toggleActivityLike(parseInt(req.params.id), userId);
      res.json({ liked });
    } catch (error) {
      res.status(500).json({ message: "Error toggling like" });
    }
  });

  // Chat routes
  app.get("/api/chat", async (req, res) => {
    try {
      const teamId = req.query.teamId as string;
      const competitionId = req.query.competitionId as string;
      
      const messages = await storage.getChatMessages(
        teamId ? parseInt(teamId) : undefined,
        competitionId ? parseInt(competitionId) : undefined
      );
      
      // Get user details for each message
      const messagesWithUsers = await Promise.all(
        messages.map(async (message) => {
          const user = await storage.getUser(message.senderId!);
          return {
            ...message,
            user: user ? { id: user.id, username: user.username, avatar: user.avatar } : null
          };
        })
      );
      
      res.json(messagesWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching messages" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const messageData = insertChatMessageSchema.parse(req.body);
      const message = await storage.createChatMessage(messageData);
      res.json(message);
    } catch (error) {
      res.status(400).json({ message: "Invalid message data" });
    }
  });

  // Friend routes
  app.get("/api/friends/:userId", async (req, res) => {
    try {
      const friendships = await storage.getFriendships(parseInt(req.params.userId));
      
      // Get user details for each friend
      const friendsWithUsers = await Promise.all(
        friendships.map(async (friendship) => {
          const friendId = friendship.userId === parseInt(req.params.userId) 
            ? friendship.friendId 
            : friendship.userId;
          const friend = await storage.getUser(friendId!);
          
          return {
            ...friendship,
            friend: friend ? { id: friend.id, username: friend.username, avatar: friend.avatar } : null
          };
        })
      );
      
      res.json(friendsWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching friends" });
    }
  });

  app.post("/api/friends", async (req, res) => {
    try {
      const friendshipData = insertFriendshipSchema.parse(req.body);
      const friendship = await storage.createFriendship(friendshipData);
      res.json(friendship);
    } catch (error) {
      res.status(400).json({ message: "Invalid friendship data" });
    }
  });

  // Competition history routes
  app.get("/api/history/:userId", async (req, res) => {
    try {
      const history = await storage.getCompetitionHistory(parseInt(req.params.userId));
      
      // Get competition and team details
      const historyWithDetails = await Promise.all(
        history.map(async (record) => {
          const competition = await storage.getCompetition(record.competitionId!);
          const team = await storage.getTeam(record.teamId!);
          
          return {
            ...record,
            competition: competition ? { id: competition.id, name: competition.name } : null,
            team: team ? { id: team.id, name: team.name } : null
          };
        })
      );
      
      res.json(historyWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Error fetching competition history" });
    }
  });

  // Competition invitation routes
  app.post("/api/competitions/:id/invite", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.id);
      const { phoneNumber, invitedBy } = req.body;
      
      // Generate unique invite token
      const { nanoid } = await import('nanoid');
      const inviteToken = nanoid(12);
      
      // Set expiration to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      const invitation = await storage.createCompetitionInvitation({
        competitionId,
        invitedBy,
        phoneNumber,
        inviteToken,
        expiresAt
      });
      
      // Generate invite URL
      const inviteUrl = `${req.protocol}://${req.get('host')}/invite/${inviteToken}`;
      
      res.json({
        ...invitation,
        inviteUrl
      });
    } catch (error) {
      res.status(400).json({ message: "Error creating invitation" });
    }
  });

  app.get("/api/invitations/:token", async (req, res) => {
    try {
      const invitation = await storage.getCompetitionInvitation(req.params.token);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      // Check if invitation has expired
      if (new Date() > new Date(invitation.expiresAt)) {
        return res.status(400).json({ message: "Invitation has expired" });
      }
      
      // Get competition details
      const competition = await storage.getCompetition(invitation.competitionId!);
      
      res.json({
        ...invitation,
        competition
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching invitation" });
    }
  });

  app.post("/api/invitations/:token/accept", async (req, res) => {
    try {
      const { userId } = req.body;
      const invitation = await storage.getCompetitionInvitation(req.params.token);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      if (invitation.status !== "pending") {
        return res.status(400).json({ message: "Invitation already processed" });
      }
      
      // Check if invitation has expired
      if (new Date() > new Date(invitation.expiresAt)) {
        return res.status(400).json({ message: "Invitation has expired" });
      }
      
      // Check if user already has an entry for this competition
      const existingEntry = await storage.getCompetitionEntry(userId, invitation.competitionId!);
      if (existingEntry) {
        return res.status(400).json({ message: "User already entered this competition" });
      }
      
      // Get user to check if it's their first competition
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create competition entry (first one is free)
      const isFirstCompetition = (user.competitionsEntered || 0) === 0;
      const entry = await storage.createCompetitionEntry({
        userId,
        competitionId: invitation.competitionId!,
        paymentType: isFirstCompetition ? "free" : "pending",
        paymentStatus: isFirstCompetition ? "completed" : "pending"
      });
      
      // Update user's competition count
      await storage.updateUser(userId, { 
        competitionsEntered: (user.competitionsEntered || 0) + 1 
      });
      
      // Mark invitation as accepted
      await storage.updateCompetitionInvitation(invitation.id, { status: "accepted" });
      
      res.json({
        entry,
        requiresPayment: !isFirstCompetition
      });
    } catch (error) {
      res.status(400).json({ message: "Error accepting invitation" });
    }
  });

  // Competition entry routes
  app.get("/api/competitions/:id/entry-status/:userId", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.id);
      const userId = parseInt(req.params.userId);
      
      const entry = await storage.getCompetitionEntry(userId, competitionId);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const isFirstCompetition = (user.competitionsEntered || 0) === 0;
      
      res.json({
        hasEntry: !!entry,
        entry: entry || null,
        isFirstCompetition,
        requiresPayment: !isFirstCompetition
      });
    } catch (error) {
      res.status(500).json({ message: "Error checking entry status" });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  const httpServer = createServer(app);
  return httpServer;
}
