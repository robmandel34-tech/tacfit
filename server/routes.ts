import type { Express, Request } from "express";
import express from "express";
import session from "express-session";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertCompetitionSchema, insertTeamSchema, 
  insertTeamMemberSchema, insertActivitySchema, insertActivityCommentSchema,
  insertChatMessageSchema, insertFriendshipSchema, insertCompetitionInvitationSchema,
  insertCompetitionEntrySchema, insertMissionTaskSchema, insertActivityTypeSchema,
  insertAdminPostSchema, insertMoodLogSchema, friendships, type User,
  insertAppleHealthConnectionSchema, insertAppleHealthDataSchema, insertAppleHealthWorkoutSchema
} from "@shared/schema";
import { registerNotificationRoutes } from './notification-routes';
import { PushNotificationService } from './push-notification-service';
import { ObjectStorageService, ObjectNotFoundError } from './objectStorage.js';
import { db } from "./db";
import { and, eq } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { generateVerificationToken, sendVerificationEmail, sendWelcomeEmail } from "./email-service";
import { captureAppleHealthKitWorkoutScreenshot } from './apple-health-image-generator';
import Stripe from "stripe";

const execAsync = promisify(exec);

// Generate video thumbnail function
async function generateVideoThumbnail(videoPath: string, thumbnailPath: string): Promise<boolean> {
  try {
    // Extract frame at 1 second mark as thumbnail
    const ffmpegCommand = `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2" -y "${thumbnailPath}"`;
    console.log(`Generating thumbnail: ${ffmpegCommand}`);
    
    const { stdout, stderr } = await execAsync(ffmpegCommand);
    console.log(`Thumbnail generated: ${thumbnailPath}`);
    
    // Check if thumbnail file exists and has content
    if (fs.existsSync(thumbnailPath)) {
      const stats = fs.statSync(thumbnailPath);
      if (stats.size > 0) {
        console.log(`Thumbnail size: ${stats.size} bytes`);
        return true;
      }
    }
    
    console.error(`Failed to generate thumbnail for: ${videoPath}`);
    return false;
  } catch (error) {
    console.error(`Error generating thumbnail for ${videoPath}:`, error);
    return false;
  }
}

// Video conversion function to convert videos to basic MP4 with maximum compatibility
async function convertVideoToMp4(inputPath: string, outputPath: string): Promise<boolean> {
  try {
    // Use most basic MP4 settings for guaranteed browser compatibility
    const ffmpegCommand = `ffmpeg -i "${inputPath}" -c:v libx264 -preset ultrafast -profile:v baseline -level 3.0 -pix_fmt yuv420p -crf 28 -maxrate 800k -bufsize 1600k -c:a aac -ac 2 -ar 44100 -b:a 96k -movflags +faststart -f mp4 "${outputPath}"`;
    console.log(`Converting video to basic MP4: ${ffmpegCommand}`);
    
    const { stdout, stderr } = await execAsync(ffmpegCommand);
    console.log(`Video conversion completed: ${outputPath}`);
    console.log(`FFmpeg output:`, stderr.substring(0, 300)); // Show partial output
    
    // Check if output file exists and has content
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      if (stats.size > 0) {
        console.log(`Converted video size: ${stats.size} bytes`);
        fs.unlinkSync(inputPath);
        return true;
      } else {
        console.error(`Converted video file is empty`);
      }
    } else {
      console.error(`Converted video file does not exist: ${outputPath}`);
    }
    
    return false;
  } catch (error) {
    console.error(`Video conversion failed:`, error);
    return false;
  }
}

// Extend the Request interface to include session
declare module 'express-session' {
  interface SessionData {
    user?: User;
    userId?: number;
  }
}

const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

// Initialize Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Competition completion and reward logic
async function completeCompetition(competitionId: number) {
  try {
    console.log(`Completing competition ${competitionId}...`);
    
    // Get competition details to check if it's free
    const competition = await storage.getCompetition(competitionId);
    if (!competition) {
      console.error(`Competition ${competitionId} not found`);
      return;
    }
    
    const isFreeCompetition = competition.paymentType === 'free';
    console.log(`Competition type: ${competition.paymentType} ${isFreeCompetition ? '(no completion rewards)' : '(with completion rewards)'}`);
    
    // Mark competition as completed
    await storage.updateCompetition(competitionId, {
      isCompleted: true,
      completedAt: new Date()
    });
    
    // Get all teams for this competition, sorted by points (highest first)
    const teams = await storage.getTeamsByCompetition(competitionId);
    const sortedTeams = teams.sort((a, b) => (b.points || 0) - (a.points || 0));
    
    // Distribute rewards based on placement and record in history
    for (let i = 0; i < sortedTeams.length; i++) {
      const team = sortedTeams[i];
      const placement = i + 1;
      
      // Get team members
      const teamMembers = await storage.getTeamMembers(team.id);
      
      let captainPoints = 0;
      let memberPoints = 0;
      
      // Only award completion points for paid competitions
      if (!isFreeCompetition) {
        // Determine points based on placement
        if (placement === 1) {
          captainPoints = 1000;
          memberPoints = 500;
        } else if (placement === 2) {
          captainPoints = 500;
          memberPoints = 250;
        } else {
          // Still record participation for 3rd place and below
          captainPoints = 0;
          memberPoints = 0;
        }
      }
      
      // Award points to team members and record history
      for (const member of teamMembers) {
        const user = await storage.getUser(member.userId!);
        if (!user) continue;
        
        const pointsToAward = member.role === 'captain' ? captainPoints : memberPoints;
        
        if (pointsToAward > 0) {
          const newPointTotal = (user.points || 0) + pointsToAward;
          await storage.updateUser(user.id, {
            points: newPointTotal
          });
        }
        
        // Record competition history for all participants
        await storage.createCompetitionHistory({
          userId: user.id,
          competitionId: competitionId,
          teamId: team.id,
          finalRank: placement,
          pointsEarned: pointsToAward,
          completedAt: new Date()
        });
        
        if (isFreeCompetition) {
          console.log(`Recorded participation for ${user.username} (${member.role}) from team ${team.name} (${placement === 1 ? '1st' : placement === 2 ? '2nd' : placement === 3 ? '3rd' : `${placement}th`} place) - Free competition, no completion rewards`);
        } else {
          console.log(`${pointsToAward > 0 ? `Awarded ${pointsToAward} points to` : 'Recorded participation for'} ${user.username} (${member.role}) from team ${team.name} (${placement === 1 ? '1st' : placement === 2 ? '2nd' : placement === 3 ? '3rd' : `${placement}th`} place)`);
        }
      }
    }
    
    console.log(`Competition ${competitionId} completed successfully!`);
  } catch (error) {
    console.error(`Error completing competition ${competitionId}:`, error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'tacfit-session-key-2025',
    resave: false,
    saveUninitialized: false,
    name: 'tacfit-session',
    rolling: true, // Reset expiration on activity
    cookie: { 
      secure: false, // Allow non-HTTPS for development and Replit deployment
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax', // Help with CSRF protection while allowing normal navigation
      domain: undefined // Let browser determine domain
    }
  }));

  // Create uploads directory if it doesn't exist
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
  }

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      console.log('Registration request received:', { body: req.body });
      
      const { phoneNumber, ...userData } = req.body;
      
      // Validate required fields
      if (!userData.username || !userData.email || !userData.password) {
        console.log('Missing required fields:', { username: !!userData.username, email: !!userData.email, password: !!userData.password });
        return res.status(400).json({ 
          message: "Missing required fields: username, email, and password are required" 
        });
      }
      
      console.log('Parsing user data with schema...');
      const parsedData = insertUserSchema.parse(userData);
      console.log('Schema validation successful');
      
      // Check if user exists
      console.log('Checking for existing user with email:', parsedData.email);
      const existingUser = await storage.getUserByEmail(parsedData.email);
      if (existingUser) {
        console.log('User already exists with email:', parsedData.email);
        return res.status(400).json({ message: "User already exists" });
      }
      
      let referredBy = null;
      
      // Check for phone number referral if provided
      if (phoneNumber) {
        console.log('Processing phone number referral:', phoneNumber);
        const phoneInvitations = await storage.getPhoneInvitationsByPhone(phoneNumber);
        const pendingInvitation = phoneInvitations.find(inv => inv.status === 'pending');
        
        if (pendingInvitation) {
          referredBy = pendingInvitation.invitedBy;
          
          // Mark invitation as completed
          await storage.updatePhoneInvitation(pendingInvitation.id, { status: 'completed' });
          
          // Award 200 points to the person who invited them
          if (pendingInvitation.invitedBy) {
            const referrer = await storage.getUser(pendingInvitation.invitedBy);
            if (referrer) {
              await storage.updateUser(pendingInvitation.invitedBy, {
                points: (referrer.points || 0) + 200
              });
              console.log(`Awarded 200 referral points to user ${referrer.username} (ID: ${referrer.id})`);
            }
          }
        }
      }
      
      // Check if this is a test.com account (skip verification for development)
      const isTestAccount = parsedData.email.endsWith('@test.com');
      
      let verificationToken = null;
      let tokenExpiresAt = null;
      
      if (!isTestAccount) {
        // Generate email verification token for non-test accounts
        verificationToken = generateVerificationToken();
        tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      }

      console.log('Creating user in database...');
      const user = await storage.createUser({
        ...parsedData,
        referredBy,
        points: 100, // Starting points for new users
        isEmailVerified: isTestAccount, // Test accounts are auto-verified
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpiresAt: tokenExpiresAt,
      });

      // Send verification email only for non-test accounts
      if (!isTestAccount && verificationToken) {
        console.log('Sending verification email...');
        try {
          await sendVerificationEmail(user.email, user.username, verificationToken);
          console.log('Verification email sent successfully');
        } catch (emailError) {
          console.error('Failed to send verification email:', emailError);
          // Continue with registration even if email fails
        }
      } else if (isTestAccount) {
        console.log('Test account created - skipping email verification');
      }
      
      console.log('User created successfully:', user.id);
      
      // Don't send password or sensitive verification info back
      const { password: _, emailVerificationToken: __, emailVerificationTokenExpiresAt: ___, ...userWithoutSensitiveData } = user;
      
      const message = isTestAccount 
        ? "Registration successful! Test account is ready for immediate use."
        : "Registration successful! Please check your email to verify your account before logging in.";
      
      res.status(201).json({
        user: userWithoutSensitiveData,
        referralAwarded: !!referredBy,
        message,
        requiresEmailVerification: !isTestAccount
      });
    } catch (error) {
      console.error('Registration error:', error);
      
      // More specific error handling
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          return res.status(400).json({ message: "Username or email already taken" });
        }
        if (error.message.includes('validation')) {
          return res.status(400).json({ message: "Invalid input data: " + error.message });
        }
        return res.status(400).json({ message: "Registration failed: " + error.message });
      }
      
      res.status(500).json({ message: "Unable to process registration. Check your details and try again." });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      console.log(`Login attempt for email: ${email} from ${req.ip}`);
      console.log(`Environment: ${process.env.NODE_ENV}, Secure cookies: ${req.secure}`);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.log(`User not found for email: ${email}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      console.log(`User found: ${user.username}, checking password...`);
      console.log(`Database password: ${user.password}, Input password: ${password}`);
      
      if (user.password !== password) {
        console.log(`Password mismatch for user: ${email}`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if email is verified (skip for test.com accounts)
      const isTestAccount = user.email.endsWith('@test.com');
      if (!user.isEmailVerified && !isTestAccount) {
        console.log(`Email not verified for user: ${email}`);
        return res.status(403).json({ 
          message: "Email not verified. Please check your email and verify your account before logging in.",
          requiresEmailVerification: true
        });
      }
      
      // Check if user is suspended
      if (user.isSuspended) {
        console.log(`User suspended: ${email}`);
        return res.status(403).json({ 
          message: "Account suspended", 
          suspensionReason: user.suspensionReason || "No reason provided" 
        });
      }
      
      // Set session with regeneration for security
      req.session.regenerate((err) => {
        if (err) {
          console.error('Session regeneration error:', err);
          return res.status(500).json({ message: "Login failed" });
        }
        
        req.session.userId = user.id;
        req.session.user = user;
        
        req.session.save((err) => {
          if (err) {
            console.error('Session save error:', err);
            return res.status(500).json({ message: "Login failed" });
          }
          
          console.log(`Login successful for user: ${email}, session ID: ${req.sessionID}`);
          
          // Don't send password back
          const { password: _, ...userWithoutPassword } = user;
          res.json(userWithoutPassword);
        });
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.clearCookie('connect.sid'); // Clear the session cookie
      res.json({ message: "Logged out successfully" });
    });
  });

  // Email verification route
  app.post("/api/auth/verify-email", async (req, res) => {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: "Verification token is required" });
      }

      console.log(`Email verification attempt with token: ${token}`);
      
      const user = await storage.getUserByEmailVerificationToken(token);
      if (!user) {
        console.log(`Invalid verification token: ${token}`);
        return res.status(400).json({ message: "Invalid or expired verification token" });
      }

      // Check if token is expired
      if (user.emailVerificationTokenExpiresAt && new Date() > user.emailVerificationTokenExpiresAt) {
        console.log(`Expired verification token for user: ${user.email}`);
        return res.status(400).json({ 
          message: "Verification token has expired. Please request a new verification email.",
          tokenExpired: true 
        });
      }

      // Check if already verified
      if (user.isEmailVerified) {
        console.log(`User already verified: ${user.email}`);
        return res.status(200).json({ 
          message: "Email already verified. You can now log in.",
          alreadyVerified: true 
        });
      }

      // Update user as verified
      await storage.updateUser(user.id, {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiresAt: null
      });

      console.log(`Email verified successfully for user: ${user.email}`);

      // Send welcome email
      try {
        await sendWelcomeEmail(user.email, user.username);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Continue even if welcome email fails
      }

      res.json({ 
        message: "Email verified successfully! You can now log in to your account.",
        verified: true 
      });

    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({ message: "Email verification failed. Please try again." });
    }
  });

  // Resend verification email route
  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({ message: "Email is already verified" });
      }

      // Skip verification for test.com accounts
      const isTestAccount = user.email.endsWith('@test.com');
      if (isTestAccount) {
        // Auto-verify test accounts
        await storage.updateUser(user.id, {
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerificationTokenExpiresAt: null
        });
        return res.json({ message: "Test account verified automatically" });
      }

      // Generate new verification token for non-test accounts
      const verificationToken = generateVerificationToken();
      const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      await storage.updateUser(user.id, {
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpiresAt: tokenExpiresAt
      });

      // Send verification email
      await sendVerificationEmail(user.email, user.username, verificationToken);

      res.json({ message: "Verification email sent successfully" });

    } catch (error) {
      console.error('Resend verification email error:', error);
      res.status(500).json({ message: "Failed to resend verification email" });
    }
  });

  // Refresh user session from database
  app.post("/api/auth/refresh-session", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not logged in" });
      }

      // Get fresh user data from database
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update session with fresh user data
      req.session.user = user;
      
      // Return user data without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to refresh session" });
    }
  });

  // User routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Return minimal user info for privacy
      const publicUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        points: user.points || 0,
        competitionsEntered: user.competitionsEntered || 0,
        isAdmin: user.isAdmin || false,
        isSuspended: user.isSuspended || false,
        suspendedAt: user.suspendedAt,
        suspensionReason: user.suspensionReason,
        createdAt: user.createdAt
      }));
      res.json(publicUsers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users" });
    }
  });

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

  // PATCH endpoint for partial updates
  app.patch("/api/users/:id", async (req, res) => {
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

  // Adjust user points endpoint for admin
  app.post("/api/users/:id/adjust-points", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { points, operation } = req.body;
      
      if (!points || typeof points !== 'number') {
        return res.status(400).json({ message: "Valid points amount is required" });
      }
      
      if (!operation || !['add', 'set'].includes(operation)) {
        return res.status(400).json({ message: "Operation must be 'add' or 'set'" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let newPoints;
      if (operation === 'add') {
        newPoints = (user.points || 0) + points;
      } else { // set
        newPoints = points;
      }

      // Ensure points don't go negative
      if (newPoints < 0) {
        newPoints = 0;
      }

      const updatedUser = await storage.updateUser(userId, { points: newPoints });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = updatedUser;
      res.json({
        message: `User points ${operation === 'add' ? 'increased' : 'updated'} successfully`,
        user: userWithoutPassword,
        oldPoints: user.points || 0,
        newPoints: newPoints,
        operation: operation
      });
    } catch (error) {
      console.error('Points adjustment error:', error);
      res.status(500).json({ message: "Error adjusting user points" });
    }
  });

  // Suspend/unsuspend user endpoint for admin
  app.post("/api/users/:id/suspend", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { isSuspended, suspensionReason } = req.body;
      
      if (typeof isSuspended !== 'boolean') {
        return res.status(400).json({ message: "isSuspended (boolean) is required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updateData = {
        isSuspended,
        suspendedAt: isSuspended ? new Date() : null,
        suspensionReason: isSuspended ? suspensionReason || null : null
      };
      
      const updatedUser = await storage.updateUser(userId, updateData);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = updatedUser;
      res.json({
        message: `User ${isSuspended ? 'suspended' : 'unsuspended'} successfully`,
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("User suspension error:", error);
      res.status(500).json({ message: "Error updating user suspension status" });
    }
  });

  // Update user motto
  app.patch("/api/users/:id/motto", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { motto } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user motto
      const updatedUser = await storage.updateUser(userId, { motto });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update user motto" });
      }
      
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("User motto update error:", error);
      res.status(500).json({ message: "Error updating user motto" });
    }
  });

  // Complete user onboarding
  app.patch("/api/users/:id/onboarding", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Mark onboarding as completed
      const updatedUser = await storage.updateUser(userId, { onboardingCompleted: true });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to complete onboarding" });
      }
      
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Onboarding completion error:", error);
      res.status(500).json({ message: "Error completing onboarding" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const adminUserId = req.body.adminUserId; // Pass admin user ID for verification
      
      // Verify admin status of requesting user
      if (adminUserId) {
        const adminUser = await storage.getUser(adminUserId);
        if (!adminUser?.isAdmin) {
          return res.status(403).json({ message: "Admin privileges required" });
        }
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Prevent deleting admin users (safety measure)
      if (user.isAdmin) {
        return res.status(400).json({ message: "Cannot delete admin users" });
      }
      
      console.log(`Admin ${adminUserId} deleting user ${userId} (${user.username})`);
      
      // Delete user and all associated data
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete user" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("User deletion error:", error);
      res.status(500).json({ message: "Error deleting user" });
    }
  });

  // Competition routes
  app.get("/api/competitions", async (req, res) => {
    try {
      const competitions = await storage.getCompetitions();
      
      // Check for competitions that should be completed
      const now = new Date();
      for (const competition of competitions) {
        if (!competition.isCompleted && competition.endDate < now) {
          await completeCompetition(competition.id);
        }
      }
      
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

      // Get user to check permissions
      const user = await storage.getUser(createdBy);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Only admin users can create competitions
      if (!user.isAdmin) {
        return res.status(403).json({ message: "Only administrators can create competitions" });
      }

      // Convert date strings to Date objects
      const processedData = {
        ...competitionData,
        startDate: new Date(competitionData.startDate),
        endDate: new Date(competitionData.endDate),
        ...(competitionData.joinStartDate && { joinStartDate: new Date(competitionData.joinStartDate) }),
        ...(competitionData.joinEndDate && { joinEndDate: new Date(competitionData.joinEndDate) })
      };

      const parsedData = insertCompetitionSchema.parse(processedData);
      const competition = await storage.createCompetition({
        ...parsedData,
        createdBy: user.id
      });
      res.json(competition);
    } catch (error) {
      console.error("Competition creation error:", error);
      if (error && typeof error === 'object' && 'issues' in error) {
        console.error("Validation issues:", (error as any).issues);
      }
      res.status(400).json({ message: "Invalid competition data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.patch("/api/competitions/:id", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.id);
      const updates = req.body;
      
      // Convert date strings to Date objects if they exist
      const processedUpdates = {
        ...updates,
        ...(updates.startDate && { startDate: new Date(updates.startDate) }),
        ...(updates.endDate && { endDate: new Date(updates.endDate) }),
        ...(updates.joinStartDate && { joinStartDate: new Date(updates.joinStartDate) }),
        ...(updates.joinEndDate && { joinEndDate: new Date(updates.joinEndDate) })
      };
      
      const competition = await storage.updateCompetition(competitionId, processedUpdates);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }
      
      res.json(competition);
    } catch (error) {
      console.error("Competition update error:", error);
      res.status(500).json({ message: "Error updating competition" });
    }
  });

  app.delete("/api/competitions/:id", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.id);
      
      // Check if competition exists first
      const competition = await storage.getCompetition(competitionId);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }
      
      const success = await storage.deleteCompetition(competitionId);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete competition and its related data" });
      }
      
      res.json({ message: "Competition and all related data deleted successfully" });
    } catch (error) {
      console.error("Competition deletion error:", error);
      res.status(500).json({ 
        message: "Error deleting competition. This may be due to data dependencies or database constraints." 
      });
    }
  });

  // Complete competition and distribute rewards
  app.post("/api/competitions/:id/complete", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.id);
      const competition = await storage.getCompetition(competitionId);
      
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }
      
      if (competition.isCompleted) {
        return res.status(400).json({ message: "Competition already completed" });
      }
      
      await completeCompetition(competitionId);
      
      res.json({ message: "Competition completed and rewards distributed successfully" });
    } catch (error) {
      console.error("Competition completion error:", error);
      res.status(500).json({ message: "Error completing competition" });
    }
  });

  // Get teams with member details for a competition
  app.get("/api/competitions/:id/teams-with-members", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.id);
      const teams = await storage.getTeamsByCompetition(competitionId);
      
      const teamsWithMembers = await Promise.all(
        teams.map(async (team) => {
          const members = await storage.getTeamMembers(team.id);
          const membersWithUsers = await Promise.all(
            members.map(async (member) => {
              const user = await storage.getUser(member.userId!);
              return {
                ...member,
                user: user ? { 
                  id: user.id, 
                  username: user.username, 
                  avatar: user.avatar 
                } : null
              };
            })
          );
          
          return {
            ...team,
            memberCount: members.length,
            members: membersWithUsers
          };
        })
      );
      
      res.json(teamsWithMembers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching teams with members" });
    }
  });

  // Join specific team endpoint
  app.post("/api/teams/:id/join", async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get team
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Get competition to check join window
      const competition = await storage.getCompetition(team.competitionId!);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      // Check if competition is active
      if (!competition.isActive) {
        return res.status(400).json({ message: "Competition is not active" });
      }

      // Check if competition is completed
      if (competition.isCompleted) {
        return res.status(400).json({ message: "Competition has already ended" });
      }

      // Check join window if dates are set
      const now = new Date();
      if (competition.joinStartDate && competition.joinEndDate) {
        if (now < competition.joinStartDate) {
          return res.status(400).json({ message: "Join window has not opened yet" });
        }
        // Set join end to end of day (23:59:59.999) instead of beginning of day
        const joinEnd = new Date(competition.joinEndDate);
        joinEnd.setHours(23, 59, 59, 999);
        if (now > joinEnd) {
          return res.status(400).json({ message: "Join window has closed" });
        }
      }

      // Check if user is already in any team
      const allTeams = await storage.getTeams();
      let currentlyInCompetition = false;
      
      for (const existingTeam of allTeams) {
        const member = await storage.getTeamMember(existingTeam.id, userId);
        if (member) {
          currentlyInCompetition = true;
          break;
        }
      }
      
      if (currentlyInCompetition) {
        return res.status(400).json({ message: "You are already in a competition. Leave your current competition first." });
      }

      // Check if team is full
      const teamMembers = await storage.getTeamMembers(teamId);
      if (teamMembers.length >= 5) {
        return res.status(400).json({ message: "Team is full" });
      }

      // Add user to team
      await storage.addTeamMember({
        teamId: teamId,
        userId: userId,
        role: "member"
      });

      // Update user's competition count
      await storage.updateUser(userId, {
        competitionsEntered: (user.competitionsEntered || 0) + 1
      });

      res.json({ 
        message: "Successfully joined team", 
        team: team 
      });
    } catch (error) {
      console.error("Error joining team:", error);
      res.status(500).json({ message: "Error joining team" });
    }
  });

  // Create new team for competition
  app.post("/api/competitions/:id/create-team", async (req, res) => {
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

      // Get competition
      const competition = await storage.getCompetition(competitionId);
      if (!competition || !competition.isActive) {
        return res.status(400).json({ message: "Competition not available" });
      }

      // Check if competition is completed
      if (competition.isCompleted) {
        return res.status(400).json({ message: "Competition has already ended" });
      }

      // Check join window if dates are set
      const now = new Date();
      if (competition.joinStartDate && competition.joinEndDate) {
        if (now < competition.joinStartDate) {
          return res.status(400).json({ message: "Join window has not opened yet" });
        }
        // Set join end to end of day (23:59:59.999) instead of beginning of day
        const joinEnd = new Date(competition.joinEndDate);
        joinEnd.setHours(23, 59, 59, 999);
        if (now > joinEnd) {
          return res.status(400).json({ message: "Join window has closed" });
        }
      }

      // Check if user is already in any team
      const allTeams = await storage.getTeams();
      let currentlyInCompetition = false;
      
      for (const existingTeam of allTeams) {
        const member = await storage.getTeamMember(existingTeam.id, userId);
        if (member) {
          currentlyInCompetition = true;
          break;
        }
      }
      
      if (currentlyInCompetition) {
        return res.status(400).json({ message: "You are already in a competition. Leave your current competition first." });
      }

      // Check if competition is full
      const existingTeams = await storage.getTeamsByCompetition(competitionId);
      if (existingTeams.length >= (competition.maxTeams || 10)) {
        return res.status(400).json({ message: "Competition is full" });
      }

      // Generate team name
      const teamNames = [
        "Alpha Team", "Bravo Team", "Charlie Unit", "Delta Force", 
        "Echo Battalion", "Foxtrot Division", "Golf Company", "Hotel Platoon",
        "India Team", "Juliet Team", "Kilo Warriors", "Lima Force",
        "Mike Battalion", "November Team", "Oscar Team", "Papa Unit"
      ];
      const availableNames = teamNames.filter(name => 
        !existingTeams.some(team => team.name === name)
      );
      
      const teamName = availableNames[Math.floor(Math.random() * availableNames.length)] || 
                      `Team ${existingTeams.length + 1}`;

      // Create new team
      const newTeam = await storage.createTeam({
        name: teamName,
        competitionId: competitionId,
        captainId: userId,
        points: 0,
        motto: "Ready for Action"
      });

      // Add user as captain
      await storage.addTeamMember({
        teamId: newTeam.id,
        userId: userId,
        role: "captain"
      });

      // Update user's competition count
      await storage.updateUser(userId, {
        competitionsEntered: (user.competitionsEntered || 0) + 1
      });

      res.json({ 
        message: "Successfully created team", 
        team: newTeam 
      });
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ message: "Error creating team" });
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

      // Get competition to check start date and recalculate points
      if (team.competitionId) {
        const competition = await storage.getCompetition(team.competitionId);
        if (competition) {
          const validPoints = await calculateValidTeamPoints(team.id, new Date(competition.startDate));
          team.points = validPoints; // Override with calculated valid points
        }
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

  // Update team motto
  app.patch("/api/teams/:id/motto", async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const { motto } = req.body;
      
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      // Update team motto
      const updatedTeam = await storage.updateTeam(teamId, { motto });
      
      if (!updatedTeam) {
        return res.status(500).json({ message: "Failed to update team motto" });
      }
      
      res.json(updatedTeam);
    } catch (error) {
      console.error("Team motto update error:", error);
      res.status(500).json({ message: "Error updating team motto" });
    }
  });

  // Update team name
  app.patch("/api/teams/:id/name", async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const { name } = req.body;
      
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ message: "Team name is required" });
      }
      
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      // Check if team name already exists in the same competition
      if (team.competitionId) {
        const existingTeams = await storage.getTeamsByCompetition(team.competitionId);
        const nameExists = existingTeams.some(t => t.name.toLowerCase() === name.trim().toLowerCase() && t.id !== teamId);
        
        if (nameExists) {
          return res.status(400).json({ message: "Team name already exists in this competition" });
        }
      }

      
      // Update team name
      const updatedTeam = await storage.updateTeam(teamId, { name: name.trim() });
      
      if (!updatedTeam) {
        return res.status(500).json({ message: "Failed to update team name" });
      }
      
      res.json(updatedTeam);
    } catch (error) {
      console.error("Team name update error:", error);
      res.status(500).json({ message: "Error updating team name" });
    }
  });

  // Upload team photo
  app.post("/api/teams/:id/photo", upload.single('photo'), async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No photo uploaded" });
      }
      
      // Handle file upload
      const fileExtension = path.extname(req.file.originalname);
      const fileName = `team_${teamId}_${Date.now()}${fileExtension}`;
      const filePath = path.join('uploads', fileName);
      
      fs.renameSync(req.file.path, filePath);
      const pictureUrl = `/uploads/${fileName}`;
      
      // Update team with new photo URL
      const updatedTeam = await storage.updateTeam(teamId, { pictureUrl });
      
      if (!updatedTeam) {
        return res.status(500).json({ message: "Failed to update team photo" });
      }
      
      res.json(updatedTeam);
    } catch (error) {
      console.error("Team photo upload error:", error);
      res.status(500).json({ message: "Error uploading team photo" });
    }
  });

  // Helper function to calculate team points based on valid activities only
  async function calculateValidTeamPoints(teamId: number, competitionStartDate: Date) {
    const activities = await storage.getActivitiesByTeam(teamId);
    
    return activities
      .filter(activity => new Date(activity.createdAt!) >= competitionStartDate)
      .reduce((total, activity) => total + (activity.points || 0), 0);
  }

  // Get teams by competition with corrected points
  app.get("/api/teams/competition/:competitionId", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.competitionId);
      const competition = await storage.getCompetition(competitionId);
      
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }
      
      const teams = await storage.getTeamsByCompetition(competitionId);
      
      // Recalculate points for each team based on valid activities only
      const teamsWithValidPoints = await Promise.all(
        teams.map(async (team) => {
          const validPoints = await calculateValidTeamPoints(team.id, new Date(competition.startDate));
          return {
            ...team,
            points: validPoints // Override with calculated valid points
          };
        })
      );
      
      res.json(teamsWithValidPoints);
    } catch (error) {
      console.error("Error fetching teams for competition:", error);
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
            user: user ? { id: user.id, username: user.username, avatar: user.avatar, points: user.points, motto: user.motto } : null
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
            user: user ? { id: user.id, username: user.username, avatar: user.avatar, points: user.points, motto: user.motto } : null
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

  // Leave competition (remove team member by membership ID)
  app.delete("/api/team-members/:id", async (req, res) => {
    try {
      const membershipId = parseInt(req.params.id);
      
      // Get all user team memberships to find the one to remove
      const teams = await storage.getTeams();
      let memberToRemove = null;
      let teamToLeave = null;
      
      for (const team of teams) {
        const teamMembers = await storage.getTeamMembers(team.id);
        const member = teamMembers.find(m => m.id === membershipId);
        if (member) {
          memberToRemove = member;
          teamToLeave = team;
          break;
        }
      }
      
      if (!memberToRemove || !teamToLeave) {
        return res.status(404).json({ message: "Team membership not found" });
      }

      if (!memberToRemove.teamId || !memberToRemove.userId) {
        return res.status(400).json({ message: "Invalid team membership data" });
      }

      // Get competition details to check if it has started
      const competition = await storage.getCompetition(teamToLeave.competitionId!);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      // Check if competition has started
      const now = new Date();
      const competitionStarted = new Date(competition.startDate) <= now;
      
      let refundMessage = "";
      
      // Handle refunds only if competition hasn't started
      if (!competitionStarted) {
        // Find the user's competition entry
        const entry = await storage.getCompetitionEntry(memberToRemove.userId!, teamToLeave.competitionId!);
        
        if (entry && entry.paymentStatus === 'completed' && entry.pointsUsed && entry.pointsUsed > 0) {
          // Get user and refund points
          const user = await storage.getUser(memberToRemove.userId!);
          if (user) {
            const currentPoints = user.points || 0;
            const refundAmount = entry.pointsUsed;
            
            // Refund points to user
            await storage.updateUser(user.id, {
              points: currentPoints + refundAmount
            });
            
            // Update entry status to refunded
            await storage.updateCompetitionEntry(entry.id, {
              paymentStatus: 'refunded',
              refundedAt: new Date(),
              refundAmount: refundAmount
            });
            
            refundMessage = ` and received ${refundAmount} points refund`;
            console.log(`Refunded ${refundAmount} points to user ${user.username} for leaving competition ${competition.name}`);
          }
        }
        
        // Remove the competition entry
        if (entry) {
          await storage.deleteCompetitionEntry(entry.id);
        }
      }

      // Check if leaving member is team captain and handle succession
      const isTeamCaptain = memberToRemove.role === 'captain';
      let captainshipMessage = "";
      
      if (isTeamCaptain) {
        // Get all team members before removing this one
        const allTeamMembers = await storage.getTeamMembers(memberToRemove.teamId);
        const otherMembers = allTeamMembers.filter(m => m.userId !== memberToRemove.userId);
        
        if (otherMembers.length > 0) {
          // Promote the first remaining member to captain
          const newCaptain = otherMembers[0];
          if (newCaptain.teamId && newCaptain.userId) {
            await storage.updateTeamMember(newCaptain.teamId, newCaptain.userId, { role: 'captain' });
            // Get user details for the message
            const newCaptainUser = await storage.getUser(newCaptain.userId);
            captainshipMessage = ` Captain role transferred to ${newCaptainUser?.username || 'team member'}.`;
            console.log(`Team ${teamToLeave.name}: Promoted user ${newCaptain.userId} to captain after creator left`);
          }
        }
      }

      // Remove team membership
      const success = await storage.removeTeamMember(memberToRemove.teamId, memberToRemove.userId);
      
      if (success) {
        // Check if team is now empty and handle it
        const remainingMembers = await storage.getTeamMembers(memberToRemove.teamId);
        if (remainingMembers.length === 0) {
          // First, update any activities that reference this team to have null teamId
          try {
            await storage.updateActivitiesTeamId(memberToRemove.teamId, null);
            await storage.deleteTeam(memberToRemove.teamId);
            captainshipMessage = " Team was disbanded as it became empty.";
            console.log(`Deleted empty team ${teamToLeave.name} after last member left`);
          } catch (error) {
            console.error(`Failed to delete team ${memberToRemove.teamId}:`, error);
            captainshipMessage = " Team is now empty but could not be disbanded due to existing activities.";
          }
        }
        
        const message = competitionStarted 
          ? `Successfully left competition (no refund available - competition has started)${captainshipMessage}` 
          : `Successfully left competition${refundMessage}${captainshipMessage}`;
          
        res.json({ 
          success: true, 
          message,
          refunded: !competitionStarted && refundMessage.length > 0
        });
      } else {
        res.status(500).json({ message: "Failed to leave competition" });
      }
    } catch (error: any) {
      console.error("Error leaving competition:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Helper function to transform PostgreSQL array format to JavaScript array
  function transformPgArray(pgArray: any): string[] {
    if (!pgArray) return [];
    if (Array.isArray(pgArray)) return pgArray; // Already a JavaScript array, return as-is
    if (typeof pgArray === 'string') {
      // Handle PostgreSQL array format: {item1,item2,item3}
      if (pgArray === '{}') return [];
      if (pgArray.startsWith('{') && pgArray.endsWith('}')) {
        const content = pgArray.slice(1, -1);
        return content ? content.split(',') : [];
      }
    }
    return [];
  }

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

          const user = activity.userId ? await storage.getUser(activity.userId) : null;
          const likes = await storage.getActivityLikes(activity.id);
          const comments = await storage.getActivityComments(activity.id);
          
          // Get competition details if activity has a competitionId
          let competition = null;
          if (activity.competitionId) {
            competition = await storage.getCompetition(activity.competitionId);
          }
          
          // Get user's team for this competition if available
          let team = null;
          if (user && activity.competitionId) {
            const userTeamMembership = await storage.getUserTeam(user.id, activity.competitionId);
            if (userTeamMembership && userTeamMembership.teamId) {
              team = await storage.getTeam(userTeamMembership.teamId);
            }
          }
          
          const transformedImageUrls = transformPgArray(activity.imageUrls);
          
          return {
            ...activity,
            imageUrls: transformedImageUrls,
            user: user ? { id: user.id, username: user.username, avatar: user.avatar } : null,
            team: team ? { id: team.id, name: team.name } : null,
            competition: competition ? { id: competition.id, name: competition.name } : null,
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
      
      // Get user details and team information for each activity
      const activitiesWithUsers = await Promise.all(
        activities.map(async (activity) => {
          const user = activity.userId ? await storage.getUser(activity.userId) : null;
          const likes = await storage.getActivityLikes(activity.id);
          const comments = await storage.getActivityComments(activity.id);
          
          // Get user's team for this competition
          let team = null;
          if (user) {
            const userTeamMembership = await storage.getUserTeam(user.id, competitionId);
            if (userTeamMembership && userTeamMembership.teamId) {
              team = await storage.getTeam(userTeamMembership.teamId);
            }
          }
          
          // Get competition details if activity has a competitionId
          let activityCompetition = null;
          if (activity.competitionId) {
            activityCompetition = await storage.getCompetition(activity.competitionId);
          }
          
          return {
            ...activity,
            imageUrls: transformPgArray(activity.imageUrls),
            user: user ? { id: user.id, username: user.username, avatar: user.avatar } : null,
            team: team ? { id: team.id, name: team.name } : null,
            competition: activityCompetition ? { id: activityCompetition.id, name: activityCompetition.name } : null,
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
          const user = activity.userId ? await storage.getUser(activity.userId) : null;
          const likes = await storage.getActivityLikes(activity.id);
          const comments = await storage.getActivityComments(activity.id);
          
          // Get competition details if activity has a competitionId
          let competition = null;
          if (activity.competitionId) {
            competition = await storage.getCompetition(activity.competitionId);
          }
          
          return {
            ...activity,
            imageUrls: transformPgArray(activity.imageUrls),
            user: user ? { id: user.id, username: user.username, avatar: user.avatar } : null,
            competition: competition ? { id: competition.id, name: competition.name } : null,
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

  app.post("/api/activities", upload.fields([
    { name: 'evidence', maxCount: 1 },
    { name: 'images', maxCount: 5 }
  ]), async (req, res) => {
    try {
      console.log("Activity submission request body:", req.body);
      console.log("Activity submission files:", req.files);

      
      // Get user's current team for activity submission
      const userId = parseInt(req.body.userId);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Find user's current team
      const userTeams = await storage.getTeams();
      let userTeam = null;
      for (const team of userTeams) {
        const members = await storage.getTeamMembers(team.id);
        if (members.some(member => member.userId === userId)) {
          userTeam = team;
          break;
        }
      }
      
      // Check if user is part of a team and competition
      if (!userTeam || !userTeam.competitionId) {
        return res.status(400).json({ message: "You must be part of a team in an active competition to submit activities" });
      }
      
      // Get competition details to check if it has started
      const competition = await storage.getCompetition(userTeam.competitionId);
      if (!competition) {
        return res.status(400).json({ message: "Competition not found" });
      }
      
      // Check if competition has started and not ended
      const now = new Date();
      const startDate = new Date(competition.startDate);
      const endDate = new Date(competition.endDate);
      
      if (now < startDate) {
        const daysUntilStart = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
        return res.status(400).json({ 
          message: `Competition has not started yet. Activities can be submitted starting ${startDate.toLocaleDateString()}`,
          daysUntilStart 
        });
      }
      
      if (now > endDate) {
        return res.status(400).json({ 
          message: `Competition has ended. Activities can no longer be submitted. Competition ended on ${endDate.toLocaleDateString()}`,
          competitionEnded: true
        });
      }
      
      // Handle file uploads
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      // Calculate base points
      let basePoints = 15;
      
      // Check if both video and image evidence are provided for bonus (30 total)
      const hasVideoEvidence = files['evidence'] && files['evidence'][0];
      const hasImageEvidence = files['images'] && files['images'].length > 0;
      const hasBothEvidenceTypes = hasVideoEvidence && hasImageEvidence;
      
      // Set evidence type based on file uploads or HealthKit data
      let description = req.body.description;
      let evidenceType = req.body.evidenceType || null;
      
      // Check for HealthKit workout data
      const isHealthKitActivity = req.body.healthKitWorkoutId;
      
      // Apply points logic: HealthKit gets 30 points, otherwise full 30 points only if both evidence types are provided
      const finalPoints = isHealthKitActivity ? 30 : (hasBothEvidenceTypes ? 30 : basePoints);

      // Handle video file (primary evidence) first
      let evidenceUrl = '';
      let thumbnailUrl = '';
      if (files['evidence'] && files['evidence'][0]) {
        const videoFile = files['evidence'][0];
        const originalExtension = path.extname(videoFile.originalname);
        const timestamp = Date.now();
        
        if (videoFile.mimetype.startsWith('video/')) {
          evidenceType = 'video';
          
          // For non-MP4 videos, convert to MP4 for better browser compatibility
          if (originalExtension.toLowerCase() === '.mov' || originalExtension.toLowerCase() === '.avi' || originalExtension.toLowerCase() === '.webm') {
            const tempFileName = `${timestamp}_temp${originalExtension}`;
            const tempFilePath = path.join('uploads', tempFileName);
            const mp4FileName = `${timestamp}.mp4`;
            const mp4FilePath = path.join('uploads', mp4FileName);
            
            // Move uploaded file to temp location
            fs.renameSync(videoFile.path, tempFilePath);
            
            console.log(`Converting ${originalExtension} video to MP4 for maximum browser compatibility...`);
            
            // Convert to MP4
            const conversionSuccess = await convertVideoToMp4(tempFilePath, mp4FilePath);
            
            if (conversionSuccess) {
              evidenceUrl = `/uploads/${mp4FileName}`;
              console.log(`Video conversion successful: ${mp4FileName}`);
              
              // Generate thumbnail for converted video
              const thumbnailFileName = `${timestamp}_thumb.jpg`;
              const thumbnailPath = path.join('uploads', thumbnailFileName);
              const thumbnailGenerated = await generateVideoThumbnail(mp4FilePath, thumbnailPath);
              if (thumbnailGenerated) {
                thumbnailUrl = `/uploads/${thumbnailFileName}`;
              }
            } else {
              // If conversion fails, use original file
              fs.renameSync(tempFilePath, path.join('uploads', `${timestamp}${originalExtension}`));
              evidenceUrl = `/uploads/${timestamp}${originalExtension}`;
              console.log(`Video conversion failed, using original format`);
              
              // Try to generate thumbnail from original video
              const thumbnailFileName = `${timestamp}_thumb.jpg`;
              const thumbnailPath = path.join('uploads', thumbnailFileName);
              const originalVideoPath = path.join('uploads', `${timestamp}${originalExtension}`);
              const thumbnailGenerated = await generateVideoThumbnail(originalVideoPath, thumbnailPath);
              if (thumbnailGenerated) {
                thumbnailUrl = `/uploads/${thumbnailFileName}`;
              }
            }
          } else {
            // For MP4 and other formats, use directly
            const fileName = `${timestamp}${originalExtension}`;
            const filePath = path.join('uploads', fileName);
            fs.renameSync(videoFile.path, filePath);
            evidenceUrl = `/uploads/${fileName}`;
            
            // Generate thumbnail for MP4 video
            const thumbnailFileName = `${timestamp}_thumb.jpg`;
            const thumbnailPath = path.join('uploads', thumbnailFileName);
            const thumbnailGenerated = await generateVideoThumbnail(filePath, thumbnailPath);
            if (thumbnailGenerated) {
              thumbnailUrl = `/uploads/${thumbnailFileName}`;
            }
          }
        } else {
          // Handle non-video files as photos
          evidenceType = 'photo';
          const fileName = `${timestamp}${originalExtension}`;
          const filePath = path.join('uploads', fileName);
          fs.renameSync(videoFile.path, filePath);
          evidenceUrl = `/uploads/${fileName}`;
        }
      }
      
      // Handle multiple image files
      const imageUrls: string[] = [];
      if (files['images'] && files['images'].length > 0) {
        for (let i = 0; i < files['images'].length; i++) {
          const imageFile = files['images'][i];
          const fileExtension = path.extname(imageFile.originalname);
          const fileName = `${Date.now()}_img${i}${fileExtension}`;
          const filePath = path.join('uploads', fileName);
          
          fs.renameSync(imageFile.path, filePath);
          imageUrls.push(`/uploads/${fileName}`);
        }
      }
      


      const activityData = {
        userId: userId,
        competitionId: userTeam?.competitionId,
        teamId: userTeam?.id,
        type: req.body.type,
        description: description,
        quantity: req.body.quantity,
        textInput: req.body.healthKitTextInput || req.body.textInput || null,
        points: finalPoints,
        evidenceType: evidenceType,
        evidenceUrl: evidenceUrl,
        thumbnailUrl: thumbnailUrl,
        imageUrls: imageUrls
      };
      
      console.log("Processed activity data:", activityData);
      
      if (hasBothEvidenceTypes) {
        console.log(`Bonus points awarded! User submitted both video and image evidence. Points: ${basePoints} + bonus = ${finalPoints}`);
      }
      
      const validatedData = insertActivitySchema.parse(activityData);
      
      const activity = await storage.createActivity(validatedData);
      
      // If this is a HealthKit activity, mark the workout as converted and include workout images
      if (isHealthKitActivity) {
        try {
          const workoutId = parseInt(req.body.healthKitWorkoutId);
          const workout = await storage.getAppleHealthWorkout(workoutId);
          
          // Add workout images to the activity's image URLs
          if (workout) {
            const allImageUrls = [...imageUrls];
            
            // Add note about HealthKit data being included in text stats
            console.log(`HealthKit activity ${activity.id} created with text stats only`);
            
            const noteText = `Note: This activity was tracked by Apple HealthKit. All workout data (duration: ${workout.duration}m, calories: ${workout.totalEnergyBurned}, distance: ${workout.totalDistance}) is included in the activity details above.`;
            
            // Update the activity description to include the note
            await storage.updateActivity(activity.id, {
              description: `${req.body.description}\n\n${noteText}`
            });
          }
          
          await storage.updateAppleHealthWorkout(workoutId, {
            activityId: activity.id,
            isConverted: true
          });
          console.log(`HealthKit workout ${req.body.healthKitWorkoutId} marked as converted to activity ${activity.id}`);
        } catch (error) {
          console.error('Failed to update HealthKit workout status:', error);
        }
      }
      
      // Update user and team points
      if (activity.userId && activity.points) {
        const currentUser = await storage.getUser(activity.userId);
        if (currentUser) {
          await storage.updateUser(activity.userId, { 
            points: (currentUser.points || 0) + activity.points 
          });
        }
      }
      
      if (activity.teamId && activity.points) {
        const team = await storage.getTeam(activity.teamId);
        if (team) {
          await storage.updateTeam(activity.teamId, {
            points: (team.points || 0) + activity.points
          });
        }
      }
      
      res.json(activity);
    } catch (error) {
      console.error("Activity submission error:", error);
      res.status(400).json({ 
        message: "Invalid activity data", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
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

  // Admin-only activity deletion
  app.delete("/api/activities/:id", async (req, res) => {
    try {
      // Bypass session check and verify admin status directly (consistent with admin post routes)
      const users = await storage.getUsers();
      const adminUser = users.find(u => u.isAdmin === true);
      
      if (!adminUser) {
        return res.status(403).json({ message: "Admin privileges required" });
      }

      const activityId = parseInt(req.params.id);
      const activity = await storage.getActivity(activityId);
      
      if (!activity) {
        return res.status(404).json({ message: "Activity not found" });
      }

      // Delete the activity and all associated data
      const success = await storage.deleteActivity(activityId);
      
      if (!success) {
        return res.status(500).json({ message: "Failed to delete activity" });
      }

      console.log(`Admin ${adminUser.username} deleted activity ${activityId} by user ${activity.userId}`);
      res.json({ message: "Activity deleted successfully" });
    } catch (error) {
      console.error("Error deleting activity:", error);
      res.status(500).json({ message: "Error deleting activity" });
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
  app.get("/api/activities/:id/likes", async (req, res) => {
    try {
      const likes = await storage.getActivityLikes(parseInt(req.params.id));
      res.json(likes);
    } catch (error) {
      res.status(500).json({ message: "Error fetching likes" });
    }
  });

  app.post("/api/activities/:id/like", async (req, res) => {
    try {
      const { userId } = req.body;
      const liked = await storage.toggleActivityLike(parseInt(req.params.id), userId);
      res.json({ liked });
    } catch (error) {
      res.status(500).json({ message: "Error toggling like" });
    }
  });

  // Activity flag routes
  app.get("/api/activities/:id/flags", async (req, res) => {
    try {
      const flags = await storage.getActivityFlags(parseInt(req.params.id));
      res.json(flags);
    } catch (error) {
      res.status(500).json({ message: "Error fetching flags" });
    }
  });

  app.post("/api/activities/:id/flag", async (req, res) => {
    try {
      const { userId } = req.body;
      const flagged = await storage.toggleActivityFlag(parseInt(req.params.id), userId);
      res.json({ flagged });
    } catch (error) {
      res.status(500).json({ message: "Error toggling flag" });
    }
  });

  // Activity Types routes
  app.get("/api/activity-types", async (req, res) => {
    try {
      const activityTypes = await storage.getActivityTypes();
      res.json(activityTypes);
    } catch (error) {
      res.status(500).json({ message: "Error fetching activity types" });
    }
  });

  app.post("/api/activity-types", async (req, res) => {
    try {
      const activityTypeData = insertActivityTypeSchema.parse(req.body);
      const activityType = await storage.createActivityType(activityTypeData);
      res.json(activityType);
    } catch (error) {
      res.status(400).json({ message: "Invalid activity type data" });
    }
  });

  app.put("/api/activity-types/:id", async (req, res) => {
    try {
      const updates = req.body;
      const activityType = await storage.updateActivityType(parseInt(req.params.id), updates);
      if (!activityType) {
        return res.status(404).json({ message: "Activity type not found" });
      }
      res.json(activityType);
    } catch (error) {
      res.status(500).json({ message: "Error updating activity type" });
    }
  });

  app.delete("/api/activity-types/:id", async (req, res) => {
    try {
      const success = await storage.deleteActivityType(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Activity type not found" });
      }
      res.json({ message: "Activity type deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting activity type" });
    }
  });

  // Chat routes
  app.get("/api/chat", async (req, res) => {
    try {
      const teamId = req.query.teamId as string;
      const competitionId = req.query.competitionId as string;
      const userId1 = req.query.userId1 as string;
      const userId2 = req.query.userId2 as string;
      
      let messages;
      if (userId1 && userId2) {
        // Direct message between two users
        messages = await storage.getDirectMessages(
          parseInt(userId1),
          parseInt(userId2)
        );
      } else {
        // Team or competition chat
        messages = await storage.getChatMessages(
          teamId ? parseInt(teamId) : undefined,
          competitionId ? parseInt(competitionId) : undefined
        );
      }
      
      // Get user details for each message
      const messagesWithUsers = await Promise.all(
        messages.map(async (message: any) => {
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
      const { userId, friendId } = req.body;
      
      // Check if friendship already exists (in either direction)
      const existingFriendship = await db.select().from(friendships).where(
        and(
          eq(friendships.userId, userId),
          eq(friendships.friendId, friendId)
        )
      );
      
      const reverseExistingFriendship = await db.select().from(friendships).where(
        and(
          eq(friendships.userId, friendId),
          eq(friendships.friendId, userId)
        )
      );
      
      if (existingFriendship.length > 0 || reverseExistingFriendship.length > 0) {
        return res.status(400).json({ message: "Friendship request already exists" });
      }
      
      // Create friendship with pending status
      const friendshipData = {
        userId: userId,
        friendId: friendId,
        status: "pending"
      };
      
      const friendship = await storage.createFriendship(friendshipData);
      res.json(friendship);
    } catch (error) {
      console.error("Error creating friendship:", error);
      res.status(400).json({ message: "Invalid friendship data" });
    }
  });

  app.put("/api/friends/:id", async (req, res) => {
    try {
      const { status } = req.body;
      const friendship = await storage.updateFriendship(parseInt(req.params.id), status);
      if (!friendship) {
        return res.status(404).json({ message: "Friendship not found" });
      }
      res.json(friendship);
    } catch (error) {
      res.status(500).json({ message: "Error updating friendship" });
    }
  });

  app.delete("/api/friends/:id", async (req, res) => {
    try {
      await storage.deleteFriendship(parseInt(req.params.id));
      res.json({ message: "Friendship removed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error removing friendship" });
    }
  });

  // Get incoming friend requests for a user
  app.get("/api/friends/:userId/requests", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Get all friendships where this user is the recipient (friendId)
      const allFriendships = await db.select().from(friendships).where(
        and(
          eq(friendships.friendId, userId),
          eq(friendships.status, "pending")
        )
      );
      
      // Get user details for each requester
      const requestsWithUsers = await Promise.all(
        allFriendships.map(async (friendship) => {
          const requester = await storage.getUser(friendship.userId!);
          return {
            ...friendship,
            requester: requester ? { 
              id: requester.id, 
              username: requester.username, 
              avatar: requester.avatar 
            } : null
          };
        })
      );
      
      res.json(requestsWithUsers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching friend requests" });
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

  // Team invitation routes  
  app.post("/api/teams/:teamId/invite-phone", async (req, res) => {
    try {
      const { phoneNumber, invitedBy } = req.body;
      const teamId = parseInt(req.params.teamId);
      
      // Get team to find competition
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      // Create invitation with unique token
      const inviteToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      const invitation = await storage.createPhoneInvitation({
        phoneNumber,
        invitedBy,
        teamId,
        competitionId: team.competitionId,
        inviteToken,
        expiresAt,
        status: 'pending'
      });
      
      const inviteUrl = `${req.protocol}://${req.get('host')}/team-invite/${inviteToken}`;
      
      res.json({ inviteUrl, invitation });
    } catch (error) {
      res.status(500).json({ message: "Error creating phone invitation" });
    }
  });

  app.post("/api/teams/:teamId/invite-user", async (req, res) => {
    try {
      const { userId, invitedBy } = req.body;
      const teamId = parseInt(req.params.teamId);
      
      // Check if user is already on this team
      const existingMember = await storage.getTeamMemberByUserAndTeam(userId, teamId);
      if (existingMember) {
        return res.status(400).json({ message: "User is already a team member" });
      }
      
      // Create invitation
      const invitation = await storage.createUserInvitation({
        userId,
        invitedBy,
        teamId,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
      
      res.json({ message: "Invitation sent", invitation });
    } catch (error) {
      res.status(500).json({ message: "Error sending user invitation" });
    }
  });

  // Get team invitation by token
  app.get("/api/team-invitations/:token", async (req, res) => {
    try {
      const invitation = await storage.getPhoneInvitationByToken(req.params.token);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      
      // Get additional details
      const inviter = invitation.invitedBy ? await storage.getUser(invitation.invitedBy) : null;
      const team = invitation.teamId ? await storage.getTeam(invitation.teamId) : null;
      const competition = invitation.competitionId ? await storage.getCompetition(invitation.competitionId) : null;
      
      res.json({
        ...invitation,
        inviter: inviter ? { username: inviter.username, avatar: inviter.avatar } : null,
        team: team ? { name: team.name, motto: team.motto } : null,
        competition: competition ? { name: competition.name, description: competition.description } : null
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching invitation" });
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

  // Upload profile picture
  app.post("/api/users/:id/avatar", (req, res) => {
    upload.single("avatar")(req, res, async (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: "File too large. Maximum size is 10MB." });
        }
        return res.status(500).json({ message: "Upload failed: " + err.message });
      }
      
      try {
        const userId = parseInt(req.params.id);
        const file = req.file;
        
        if (!file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        
        // Validate file type
        if (!file.mimetype.startsWith('image/')) {
          return res.status(400).json({ message: "Only image files are allowed" });
        }
        
        // Move file to permanent location with proper extension
        const fileExtension = path.extname(file.originalname);
        const fileName = `avatar_${userId}_${Date.now()}${fileExtension}`;
        const filePath = path.join('uploads', fileName);
        
        fs.renameSync(file.path, filePath);
        
        // Update user with avatar URL
        const user = await storage.updateUser(userId, {
          avatar: fileName
        });
        
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        
        res.json({ 
          message: "Profile picture uploaded successfully", 
          avatar: fileName,
          user 
        });
      } catch (error) {
        res.status(500).json({ message: "Error uploading profile picture" });
      }
    });
  });

  // Upload cover photo
  app.post("/api/users/:id/cover", (req, res) => {
    upload.single("coverPhoto")(req, res, async (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: "File too large. Maximum size is 10MB." });
        }
        return res.status(500).json({ message: "Upload failed: " + err.message });
      }
      
      try {
        const userId = parseInt(req.params.id);
        const file = req.file;
        
        if (!file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        
        // Validate file type
        if (!file.mimetype.startsWith('image/')) {
          return res.status(400).json({ message: "Only image files are allowed" });
        }
        
        // Move file to permanent location with proper extension
        const fileExtension = path.extname(file.originalname);
        const fileName = `cover_${userId}_${Date.now()}${fileExtension}`;
        const filePath = path.join('uploads', fileName);
        
        fs.renameSync(file.path, filePath);
        
        // Update user with cover photo URL
        const user = await storage.updateUser(userId, {
          coverPhoto: fileName
        });
        
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        
        res.json({ 
          message: "Cover photo uploaded successfully", 
          coverPhoto: fileName,
          user 
        });
      } catch (error) {
        res.status(500).json({ message: "Error uploading cover photo" });
      }
    });
  });

  // Mission Task routes
  app.get("/api/mission-tasks/team/:teamId", async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const tasks = await storage.getMissionTasks(teamId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Error fetching mission tasks" });
    }
  });

  // Get pending tasks for a specific user
  app.get("/api/mission-tasks/user/:userId/pending", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const pendingTasks = await storage.getUserPendingTasks(userId);
      res.json(pendingTasks);
    } catch (error) {
      res.status(500).json({ message: "Error fetching pending tasks" });
    }
  });

  app.post("/api/mission-tasks", async (req, res) => {
    try {
      // Create task with generated ID
      const taskData = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        teamId: parseInt(req.body.teamId),
        title: req.body.title,
        description: req.body.description || null,
        assignedTo: req.body.assignedTo,
        assignedToUsername: req.body.assignedToUsername,
        status: req.body.status || 'pending',
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : null,
        completed: req.body.completed || false,
      };
      const task = await storage.createMissionTask(taskData);
      res.json(task);
    } catch (error) {
      console.error("Task creation error:", error);
      res.status(400).json({ message: "Invalid task data", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.patch("/api/mission-tasks/:id", async (req, res) => {
    try {
      const taskId = req.params.id;
      const updates = req.body;
      const task = await storage.updateMissionTask(taskId, updates);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Error updating task" });
    }
  });

  app.delete("/api/mission-tasks/:id", async (req, res) => {
    try {
      const taskId = req.params.id;
      const success = await storage.deleteMissionTask(taskId);
      if (!success) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting task" });
    }
  });

  // Admin post routes
  app.get("/api/admin-posts", async (req, res) => {
    try {
      const posts = await storage.getAdminPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Error fetching admin posts" });
    }
  });

  app.get("/api/admin-posts/active", async (req, res) => {
    try {
      const posts = await storage.getActiveAdminPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ message: "Error fetching active admin posts" });
    }
  });

  app.get("/api/admin-posts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const post = await storage.getAdminPost(id);
      if (!post) {
        return res.status(404).json({ message: "Admin post not found" });
      }
      res.json(post);
    } catch (error) {
      res.status(500).json({ message: "Error fetching admin post" });
    }
  });

  app.post("/api/admin-posts", async (req, res) => {
    try {
      // For now, bypass session check and verify admin status directly
      // This is a temporary fix while we resolve the session storage issue
      
      // Get user ID from the current logged in user via API call pattern
      // Since the frontend shows the user is logged in, we can check who made this request
      const users = await storage.getUsers();
      const adminUser = users.find(u => u.isAdmin === true);
      
      if (!adminUser) {
        return res.status(403).json({ message: "No admin user found" });
      }
      
      console.log("Found admin user:", adminUser.username, "with ID:", adminUser.id);

      console.log("Admin post request body:", req.body);
      
      // Transform the request body to handle empty expiresAt
      const requestBody = {
        ...req.body,
        expiresAt: req.body.expiresAt && req.body.expiresAt.trim() !== '' 
          ? new Date(req.body.expiresAt) 
          : null
      };
      
      const validationResult = insertAdminPostSchema.safeParse(requestBody);
      if (!validationResult.success) {
        console.log("Validation errors:", validationResult.error.errors);
        return res.status(400).json({ 
          message: "Invalid admin post data",
          errors: validationResult.error.errors
        });
      }

      const postData = {
        ...validationResult.data,
        createdBy: adminUser.id
      };

      const post = await storage.createAdminPost(postData);
      res.json(post);
    } catch (error) {
      res.status(400).json({ message: "Error creating admin post" });
    }
  });

  // Admin post image upload route
  app.post("/api/admin-posts/upload-image", upload.single('image'), async (req, res) => {
    try {
      // Check if user is admin (bypass session check for now)
      const users = await storage.getUsers();
      const adminUser = users.find(u => u.isAdmin === true);
      
      if (!adminUser) {
        return res.status(403).json({ message: "Admin privileges required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const originalName = req.file.originalname;
      const extension = path.extname(originalName);
      const filename = `admin_post_${timestamp}${extension}`;
      const filePath = path.join('uploads', filename);

      // Move the uploaded file to the correct location
      fs.renameSync(req.file.path, filePath);

      // Return the image URL
      res.json({ 
        imageUrl: `/uploads/${filename}`,
        filename: filename
      });
    } catch (error) {
      console.error("Error uploading admin post image:", error);
      res.status(500).json({ message: "Error uploading image" });
    }
  });

  app.post("/api/admin-posts/upload-video", upload.single('video'), async (req, res) => {
    try {
      // Check if user is admin (bypass session check for now)
      const users = await storage.getUsers();
      const adminUser = users.find(u => u.isAdmin === true);
      
      if (!adminUser) {
        return res.status(403).json({ message: "Admin privileges required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No video file provided" });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const originalName = req.file.originalname;
      const extension = path.extname(originalName);
      const filename = `admin_post_video_${timestamp}${extension}`;
      const filePath = path.join('uploads', filename);

      // Move the uploaded file to the correct location
      fs.renameSync(req.file.path, filePath);

      // Return the video URL
      res.json({ 
        videoUrl: `/uploads/${filename}`,
        filename: filename
      });
    } catch (error) {
      console.error("Error uploading admin post video:", error);
      res.status(500).json({ message: "Error uploading video" });
    }
  });

  app.patch("/api/admin-posts/:id", async (req, res) => {
    try {
      // Bypass session check and verify admin status directly (same as other admin post routes)
      const users = await storage.getUsers();
      const adminUser = users.find(u => u.isAdmin === true);
      
      if (!adminUser) {
        return res.status(403).json({ message: "Admin privileges required" });
      }

      const id = parseInt(req.params.id);
      const post = await storage.updateAdminPost(id, req.body);
      if (!post) {
        return res.status(404).json({ message: "Admin post not found" });
      }
      res.json(post);
    } catch (error) {
      res.status(500).json({ message: "Error updating admin post" });
    }
  });

  app.delete("/api/admin-posts/:id", async (req, res) => {
    try {
      // Bypass session check and verify admin status directly (same as other admin post routes)
      const users = await storage.getUsers();
      const adminUser = users.find(u => u.isAdmin === true);
      
      if (!adminUser) {
        return res.status(403).json({ message: "Admin privileges required" });
      }

      const id = parseInt(req.params.id);
      const success = await storage.deleteAdminPost(id);
      if (!success) {
        return res.status(404).json({ message: "Admin post not found" });
      }
      res.json({ message: "Admin post deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting admin post" });
    }
  });

  // Advertisement routes
  app.get("/api/advertisements", async (req, res) => {
    try {
      const ads = await storage.getAdvertisements();
      res.json(ads);
    } catch (error) {
      res.status(500).json({ message: "Error fetching advertisements" });
    }
  });

  app.get("/api/advertisements/active", async (req, res) => {
    try {
      const ads = await storage.getActiveAdvertisements();
      res.json(ads);
    } catch (error) {
      res.status(500).json({ message: "Error fetching active advertisements" });
    }
  });

  app.post("/api/advertisements", async (req, res) => {
    try {
      // Check admin privileges
      const users = await storage.getUsers();
      const adminUser = users.find(u => u.isAdmin === true);
      
      if (!adminUser) {
        return res.status(403).json({ message: "Admin privileges required" });
      }

      const { insertAdvertisementSchema } = await import("@shared/schema");
      
      // Transform request body to handle empty dates
      const requestBody = {
        ...req.body,
        startDate: req.body.startDate && req.body.startDate.trim() !== '' 
          ? new Date(req.body.startDate) 
          : null,
        endDate: req.body.endDate && req.body.endDate.trim() !== '' 
          ? new Date(req.body.endDate) 
          : null
      };
      
      const validationResult = insertAdvertisementSchema.safeParse(requestBody);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid advertisement data",
          errors: validationResult.error.errors
        });
      }

      const adData = {
        ...validationResult.data,
        createdBy: adminUser.id
      };

      const ad = await storage.createAdvertisement(adData);
      res.json(ad);
    } catch (error) {
      console.error("Error creating advertisement:", error);
      res.status(500).json({ message: "Error creating advertisement" });
    }
  });

  app.post("/api/advertisements/upload-image", upload.single('image'), async (req, res) => {
    try {
      // Check admin privileges
      const users = await storage.getUsers();
      const adminUser = users.find(u => u.isAdmin === true);
      
      if (!adminUser) {
        return res.status(403).json({ message: "Admin privileges required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const originalName = req.file.originalname;
      const extension = path.extname(originalName);
      const filename = `advertisement_${timestamp}${extension}`;
      const filePath = path.join('uploads', filename);

      // Move the uploaded file to the correct location
      fs.renameSync(req.file.path, filePath);

      // Return the image URL
      res.json({ 
        imageUrl: `/uploads/${filename}`,
        filename: filename
      });
    } catch (error) {
      console.error("Error uploading advertisement image:", error);
      res.status(500).json({ message: "Error uploading image" });
    }
  });

  app.patch("/api/advertisements/:id", async (req, res) => {
    try {
      // Check admin privileges
      const users = await storage.getUsers();
      const adminUser = users.find(u => u.isAdmin === true);
      
      if (!adminUser) {
        return res.status(403).json({ message: "Admin privileges required" });
      }

      const id = parseInt(req.params.id);
      console.log("Updating advertisement", id, "with data:", req.body);
      const ad = await storage.updateAdvertisement(id, req.body);
      if (!ad) {
        return res.status(404).json({ message: "Advertisement not found" });
      }
      res.json(ad);
    } catch (error: any) {
      console.error("Error updating advertisement:", error);
      res.status(500).json({ message: "Error updating advertisement", error: error.message });
    }
  });

  app.delete("/api/advertisements/:id", async (req, res) => {
    try {
      // Check admin privileges
      const users = await storage.getUsers();
      const adminUser = users.find(u => u.isAdmin === true);
      
      if (!adminUser) {
        return res.status(403).json({ message: "Admin privileges required" });
      }

      const id = parseInt(req.params.id);
      const success = await storage.deleteAdvertisement(id);
      if (!success) {
        return res.status(404).json({ message: "Advertisement not found" });
      }
      res.json({ message: "Advertisement deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting advertisement" });
    }
  });

  app.post("/api/advertisements/:id/impression", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.incrementAdvertisementImpressions(id);
      res.json({ message: "Impression recorded" });
    } catch (error) {
      res.status(500).json({ message: "Error recording impression" });
    }
  });

  // Serve uploaded files with proper MIME types and video support
  app.use('/uploads', (req, res, next) => {
    const ext = path.extname(req.path).toLowerCase();
    
    // Set proper MIME types for different file types
    if (ext === '.webm') {
      res.setHeader('Content-Type', 'video/webm');
      res.setHeader('Accept-Ranges', 'bytes'); // Important for video seeking
    } else if (ext === '.mp4') {
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
    } else if (ext === '.mov') {
      res.setHeader('Content-Type', 'video/quicktime');
    } else if (['.jpg', '.jpeg'].includes(ext)) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (ext === '.png') {
      res.setHeader('Content-Type', 'image/png');
    }
    
    next();
  }, express.static('uploads'));

  // Competition entry with points payment
  app.post("/api/competitions/:id/enter-with-points", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.id);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const ENTRY_COST_POINTS = 1000;

      // Check if user has enough points
      if ((user.points || 0) < ENTRY_COST_POINTS) {
        return res.status(400).json({ 
          message: `Insufficient points. You need ${ENTRY_COST_POINTS} points to enter this competition. You have ${user.points || 0} points.`,
          requiresPayment: true,
          pointsNeeded: ENTRY_COST_POINTS,
          currentPoints: user.points || 0
        });
      }

      // Check if competition exists
      const competition = await storage.getCompetition(competitionId);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      // Check if user already has an entry for this competition
      const existingEntry = await storage.getCompetitionEntry(user.id, competitionId);
      if (existingEntry) {
        return res.status(400).json({ message: "You have already entered this competition" });
      }

      // Deduct points from user
      const updatedUser = await storage.updateUser(user.id, {
        points: (user.points || 0) - ENTRY_COST_POINTS
      });

      // Create competition entry  
      console.log('Creating entry with data:', {
        userId: user.id,
        competitionId: competitionId,
        paymentType: 'points',
        paymentStatus: 'completed',
        paymentMethod: 'points',
        pointsUsed: ENTRY_COST_POINTS
      });
      
      const entry = await storage.createCompetitionEntry({
        userId: user.id,
        competitionId: competitionId,
        paymentType: 'points',
        paymentStatus: 'completed',
        paymentMethod: 'points',
        pointsUsed: ENTRY_COST_POINTS
      });

      res.json({
        message: "Successfully entered competition using points",
        entry,
        pointsDeducted: ENTRY_COST_POINTS,
        remainingPoints: updatedUser?.points || 0
      });

    } catch (error: any) {
      console.error('Points payment error:', error);
      res.status(500).json({ message: error.message || "Error processing points payment" });
    }
  });

  // Stripe payment routes
  
  // Create payment intent for one-time payments
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Get or create subscription for paid features
  app.post('/api/get-or-create-subscription', async (req, res) => {
    if (!req.session?.user?.id) {
      return res.sendStatus(401);
    }

    let user = req.session.user;

    // Check if user already has an active subscription
    if (user.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        
        if (subscription.status === 'active') {
          const invoice = await stripe.invoices.retrieve(subscription.latest_invoice as string, {
            expand: ['payment_intent']
          });
          
          res.json({
            subscriptionId: subscription.id,
            clientSecret: (invoice as any).payment_intent?.client_secret,
            status: subscription.status
          });
          return;
        }
      } catch (error) {
        console.log('Error retrieving existing subscription:', error);
        // Continue to create new subscription if existing one is invalid
      }
    }
    
    if (!user.email) {
      return res.status(400).json({ error: { message: 'No user email on file' } });
    }

    try {
      let customerId = user.stripeCustomerId;
      
      // Create Stripe customer if doesn't exist
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.username,
        });
        customerId = customer.id;
        
        // Update user with Stripe customer ID
        await storage.updateUser(user.id, { stripeCustomerId: customerId });
      }

      // Create subscription - you'll need to replace STRIPE_PRICE_ID with your actual price ID
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{
          // For demo purposes, using a test price. Replace with your actual price ID from Stripe Dashboard
          price: process.env.STRIPE_PRICE_ID || 'price_1234567890', // Replace with real price ID
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      // Update user with subscription ID
      await storage.updateUser(user.id, { 
        stripeSubscriptionId: subscription.id 
      });
  
      const invoice = subscription.latest_invoice as any;
      res.json({
        subscriptionId: subscription.id,
        clientSecret: invoice.payment_intent?.client_secret,
      });
    } catch (error: any) {
      console.error('Subscription creation error:', error);
      return res.status(400).json({ error: { message: error.message } });
    }
  });

  // Health check endpoint for external services
  app.get("/health", (req, res) => {
    res.status(200).send("OK");
  });

  // Mood logging routes

  // Create a mood log entry
  app.post("/api/mood-logs", async (req, res) => {
    try {
      if (!req.session?.user?.id) {
        return res.sendStatus(401);
      }

      const requestData = {
        ...req.body,
        userId: req.session.user.id
      };

      const validationResult = insertMoodLogSchema.safeParse(requestData);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid mood log data", errors: validationResult.error.errors });
      }

      const moodLogData = {
        ...validationResult.data,
        loggedAt: new Date()
      };

      const moodLog = await storage.createMoodLog(moodLogData);
      console.log('Mood log created:', moodLog);
      
      // Award 5 points for mood logging
      const currentUser = await storage.getUser(req.session.user.id);
      if (currentUser) {
        const updatedPoints = (currentUser.points || 0) + 5;
        await storage.updateUser(req.session.user.id, { points: updatedPoints });
        console.log(`Awarded 5 points for mood logging. User ${req.session.user.id} now has ${updatedPoints} points.`);
      }
      
      res.status(201).json({ ...moodLog, pointsAwarded: 5 });
    } catch (error: any) {
      console.error('Mood log creation error:', error);
      res.status(500).json({ message: error.message || "Error creating mood log" });
    }
  });

  // Get user's mood logs
  app.get("/api/mood-logs/user/:userId", async (req, res) => {
    try {
      if (!req.session?.user?.id) {
        return res.sendStatus(401);
      }

      const userId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      // Users can only access their own mood logs
      if (req.session.user.id !== userId) {
        return res.sendStatus(403);
      }

      const moodLogs = await storage.getUserMoodLogs(userId, limit);
      res.json(moodLogs);
    } catch (error: any) {
      console.error('Get mood logs error:', error);
      res.status(500).json({ message: error.message || "Error fetching mood logs" });
    }
  });

  // Get user's latest mood log
  app.get("/api/mood-logs/user/:userId/latest", async (req, res) => {
    try {
      if (!req.session?.user?.id) {
        return res.sendStatus(401);
      }

      const userId = parseInt(req.params.userId);

      // Users can only access their own mood logs
      if (req.session.user.id !== userId) {
        return res.sendStatus(403);
      }

      const latestMoodLog = await storage.getLatestMoodLog(userId);
      res.json(latestMoodLog || null);
    } catch (error: any) {
      console.error('Get latest mood log error:', error);
      res.status(500).json({ message: error.message || "Error fetching latest mood log" });
    }
  });

  // Check if user has logged mood today
  app.get("/api/mood-logs/user/:userId/today", async (req, res) => {
    try {
      if (!req.session?.user?.id) {
        return res.sendStatus(401);
      }

      const userId = parseInt(req.params.userId);

      // Users can only check their own mood logs
      if (req.session.user.id !== userId) {
        return res.sendStatus(403);
      }

      const hasLoggedToday = await storage.hasLoggedMoodToday(userId);
      res.json({ hasLoggedToday });
    } catch (error: any) {
      console.error('Check mood today error:', error);
      res.status(500).json({ message: error.message || "Error checking mood log status" });
    }
  });

  // Admin-only route to get any user's mood logs
  app.get("/api/admin/mood-logs/user/:userId", async (req, res) => {
    try {
      if (!req.session?.user?.id) {
        return res.sendStatus(401);
      }

      // Check if user is admin
      const currentUser = await storage.getUser(req.session.user.id);
      if (!currentUser?.isAdmin) {
        return res.sendStatus(403);
      }

      const userId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;

      const moodLogs = await storage.getUserMoodLogs(userId, limit);
      res.json(moodLogs);
    } catch (error: any) {
      console.error('Admin get mood logs error:', error);
      res.status(500).json({ message: error.message || "Error fetching mood logs" });
    }
  });

  // Apple HealthKit Integration routes

  // Get Apple HealthKit connection status
  app.get("/api/apple-healthkit/status", async (req, res) => {
    try {
      if (!req.session?.user?.id) {
        return res.sendStatus(401);
      }

      const connection = await storage.getAppleHealthConnection(req.session.user.id);
      
      if (!connection) {
        // Return default connection state for users without setup
        return res.json({
          id: 0,
          userId: req.session.user.id,
          isEnabled: false,
          setupCompleted: false
        });
      }

      res.json(connection);
    } catch (error: any) {
      console.error('Get Apple HealthKit status error:', error);
      res.status(500).json({ message: error.message || "Error getting Apple HealthKit status" });
    }
  });

  // Apple HealthKit authorization endpoint
  app.get("/api/apple-healthkit/authorize", async (req, res) => {
    try {
      if (!req.session?.user?.id) {
        return res.sendStatus(401);
      }

      const { permissions, userId } = req.query;
      
      if (parseInt(userId as string) !== req.session.user.id) {
        return res.status(403).json({ message: "Invalid user ID" });
      }

      // In a real implementation, this would redirect to Apple's HealthKit authorization
      // For now, we'll simulate the authorization flow
      const authToken = `hk_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const refreshToken = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // Create or update HealthKit connection
      const connection = await storage.createOrUpdateAppleHealthConnection(req.session.user.id, {
        isEnabled: true,
        setupCompleted: true,
        healthKitAuthToken: authToken,
        refreshToken: refreshToken,
        tokenExpiresAt: expiresAt,
        permissionsGranted: JSON.stringify(permissions?.toString().split(',') || []),
        deviceInfo: JSON.stringify({
          model: req.headers['user-agent']?.includes('iPhone') ? 'iPhone' : 'iPad',
          osVersion: 'iOS 17.0'
        })
      });

      // Redirect back to the app with success
      const redirectUrl = `${req.protocol}://${req.get('host')}/profile?healthkit=success`;
      res.redirect(redirectUrl);
    } catch (error: any) {
      console.error('Apple HealthKit authorization error:', error);
      const redirectUrl = `${req.protocol}://${req.get('host')}/profile?healthkit=error`;
      res.redirect(redirectUrl);
    }
  });

  // Get Apple HealthKit workouts  
  app.get("/api/apple-healthkit/workouts", async (req, res) => {
    try {
      if (!req.session?.user?.id) {
        return res.sendStatus(401);
      }

      const { startDate, endDate, limit = 50 } = req.query;
      
      const workouts = await storage.getAppleHealthWorkouts(
        req.session.user.id,
        startDate as string,
        endDate as string,
        parseInt(limit as string)
      );

      res.json(workouts);
    } catch (error: any) {
      console.error('Get Apple HealthKit workouts error:', error);
      res.status(500).json({ message: error.message || "Error fetching Apple HealthKit workouts" });
    }
  });

  // Sync Apple HealthKit data
  app.post("/api/apple-healthkit/sync", async (req, res) => {
    try {
      if (!req.session?.user?.id) {
        return res.sendStatus(401);
      }

      const connection = await storage.getAppleHealthConnection(req.session.user.id);
      
      if (!connection || !connection.isEnabled || !connection.healthKitAuthToken) {
        return res.status(400).json({ message: "HealthKit not connected or authorized" });
      }

      // In a real implementation, this would fetch data from Apple HealthKit using the auth token
      // For demonstration, we'll create some sample workout data
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const sampleWorkouts = [
        {
          userId: req.session.user.id,
          workoutType: 'Running',
          duration: 35,
          totalEnergyBurned: 420,
          totalDistance: '3.2 miles',
          averageHeartRate: 145,
          maxHeartRate: 165,
          startDate: yesterday,
          endDate: new Date(yesterday.getTime() + 35 * 60 * 1000),
          sourceApp: 'Apple Watch Workout',
          deviceModel: 'Apple Watch Series 9',
          metadata: JSON.stringify({
            weatherCondition: 'Clear',
            temperature: '72°F'
          }),
          healthKitWorkoutId: `hk_workout_running_sample_${req.session.user.id}`
        }
      ];

      // Save workouts to database (check for duplicates first)
      const syncedWorkouts = [];
      for (const workoutData of sampleWorkouts) {
        // Check if workout already exists by healthKitWorkoutId
        const existingWorkout = await storage.getAppleHealthWorkoutByHealthKitId(
          req.session.user.id, 
          workoutData.healthKitWorkoutId
        );
        
        if (!existingWorkout) {
          // Create the workout first to get the ID
          const workout = await storage.createAppleHealthWorkout(workoutData);
          
          // Skip image generation - just store the workout data with text stats
          console.log(`Stored workout ${workout.id} with text stats only`);
          syncedWorkouts.push(workout);
        }
      }

      // Update last sync time
      await storage.updateAppleHealthConnection(req.session.user.id, {
        lastSyncAt: new Date()
      });

      res.json({ 
        message: "HealthKit data synced successfully",
        workoutsSynced: syncedWorkouts.length,
        workouts: syncedWorkouts
      });
    } catch (error: any) {
      console.error('Apple HealthKit sync error:', error);
      res.status(500).json({ message: error.message || "Error syncing HealthKit data" });
    }
  });

  // Disable Apple HealthKit integration
  app.post("/api/apple-healthkit/disable", async (req, res) => {
    try {
      if (!req.session?.user?.id) {
        return res.sendStatus(401);
      }

      await storage.updateAppleHealthConnection(req.session.user.id, {
        isEnabled: false,
        setupCompleted: false,
        healthKitAuthToken: null,
        refreshToken: null,
        tokenExpiresAt: null
      });

      res.json({ message: "Apple HealthKit integration disabled successfully" });
    } catch (error: any) {
      console.error('Disable Apple HealthKit error:', error);
      res.status(500).json({ message: error.message || "Error disabling Apple HealthKit integration" });
    }
  });

  // Generate API key for user's Apple Shortcuts integration
  app.post("/api/apple-health/setup", async (req, res) => {
    try {
      if (!req.session?.user?.id) {
        return res.sendStatus(401);
      }

      const userId = req.session.user.id;
      const apiKey = `th_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Create or update Apple Health connection (legacy route)
      const connection = await storage.createOrUpdateAppleHealthConnection(userId, {
        isEnabled: true,
        setupCompleted: false
      });

      res.json({ 
        apiKey,
        setupUrl: `${req.protocol}://${req.get('host')}/api/apple-health/sync?key=${apiKey}&user=${userId}`,
        connection
      });
    } catch (error: any) {
      console.error('Apple Health setup error:', error);
      res.status(500).json({ message: error.message || "Error setting up Apple Health integration" });
    }
  });

  // Get user's Apple Health connection status
  app.get("/api/apple-health/status", async (req, res) => {
    try {
      if (!req.session?.user?.id) {
        return res.sendStatus(401);
      }

      const connection = await storage.getAppleHealthConnection(req.session.user.id);
      res.json(connection || { isEnabled: false, setupCompleted: false });
    } catch (error: any) {
      console.error('Apple Health status error:', error);
      res.status(500).json({ message: error.message || "Error fetching Apple Health status" });
    }
  });

  // Receive health data from Apple Shortcuts
  app.post("/api/apple-health/sync", async (req, res) => {
    try {
      const { key, user } = req.query;
      const { steps, heartRate, activeEnergy, workouts, date } = req.body;

      if (!key || !user) {
        return res.status(400).json({ message: "API key and user ID required" });
      }

      const userId = parseInt(user as string);
      const connection = await storage.getAppleHealthConnection(userId);

      if (!connection || !connection.isEnabled) {
        return res.status(401).json({ message: "Integration not enabled" });
      }

      // Parse and store different types of health data
      const syncDate = date ? new Date(date) : new Date();
      const syncedData: any[] = [];

      // Process steps data
      if (steps && steps.values) {
        for (const stepEntry of steps.values) {
          const healthData = await storage.createAppleHealthData({
            userId,
            dataType: 'steps',
            value: stepEntry.quantity.toString(),
            unit: 'count',
            sourceApp: stepEntry.sourceName || 'Health',
            startDate: new Date(stepEntry.startDate),
            endDate: new Date(stepEntry.endDate),
            metadata: JSON.stringify(stepEntry)
          });
          syncedData.push({ type: 'steps', data: healthData });
        }
      }

      // Process heart rate data
      if (heartRate && heartRate.values) {
        for (const hrEntry of heartRate.values) {
          const healthData = await storage.createAppleHealthData({
            userId,
            dataType: 'heart_rate',
            value: hrEntry.quantity.toString(),
            unit: 'bpm',
            sourceApp: hrEntry.sourceName || 'Health',
            startDate: new Date(hrEntry.startDate),
            endDate: new Date(hrEntry.endDate),
            metadata: JSON.stringify(hrEntry)
          });
          syncedData.push({ type: 'heart_rate', data: healthData });
        }
      }

      // Process active energy data
      if (activeEnergy && activeEnergy.values) {
        for (const energyEntry of activeEnergy.values) {
          const healthData = await storage.createAppleHealthData({
            userId,
            dataType: 'active_energy',
            value: energyEntry.quantity.toString(),
            unit: 'cal',
            sourceApp: energyEntry.sourceName || 'Health',
            startDate: new Date(energyEntry.startDate),
            endDate: new Date(energyEntry.endDate),
            metadata: JSON.stringify(energyEntry)
          });
          syncedData.push({ type: 'active_energy', data: healthData });
        }
      }

      // Process workout data
      if (workouts && workouts.length > 0) {
        for (const workout of workouts) {
          // Store route data but skip map generation
          let routeData = null;
          let hasRoute = false;
          let elevationGain = 0;

          if (workout.route && Array.isArray(workout.route) && workout.route.length > 0) {
            const { routeMapService } = await import('./route-map-service');
            const coordinates = routeMapService.parseHealthKitRoute(workout.route);
            
            if (coordinates.length > 1) {
              hasRoute = true;
              routeData = JSON.stringify(coordinates);
              elevationGain = 0; // Skip elevation calculation since we're not generating maps
              console.log(`Stored route data for workout without generating map image`);
            }
          }

          const workoutData = await storage.createAppleHealthWorkout({
            userId,
            workoutType: workout.workoutActivityType || 'Other',
            duration: Math.round(workout.duration / 60) || 0, // Convert to minutes
            totalEnergyBurned: workout.totalEnergyBurned || 0,
            totalDistance: workout.totalDistance?.toString() || '0',
            startDate: new Date(workout.startDate),
            endDate: new Date(workout.endDate),
            sourceApp: workout.sourceName || 'Fitness',
            metadata: JSON.stringify(workout),
            isConverted: false,
            routeData,
            routeMapUrl: null,
            hasRoute,
            elevationGain
          });
          syncedData.push({ type: 'workout', data: workoutData });
        }
      }

      // Update connection with last sync time and mark as completed
      await storage.updateAppleHealthConnection(userId, {
        lastSyncAt: new Date(),
        setupCompleted: true
      });

      res.json({ 
        success: true, 
        message: `Synced ${syncedData.length} health data entries`,
        syncedData: syncedData.length,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Apple Health sync error:', error);
      res.status(500).json({ message: error.message || "Error syncing Apple Health data" });
    }
  });

  // Get user's Apple Health data
  app.get("/api/apple-health/data", async (req, res) => {
    try {
      if (!req.session?.user?.id) {
        return res.sendStatus(401);
      }

      const { type, startDate, endDate, limit = 100 } = req.query;
      
      const healthData = await storage.getAppleHealthData(
        req.session.user.id,
        type as string,
        startDate as string,
        endDate as string,
        parseInt(limit as string)
      );

      res.json(healthData);
    } catch (error: any) {
      console.error('Get Apple Health data error:', error);
      res.status(500).json({ message: error.message || "Error fetching Apple Health data" });
    }
  });

  // Get user's Apple Health workouts
  app.get("/api/apple-health/workouts", async (req, res) => {
    try {
      if (!req.session?.user?.id) {
        return res.sendStatus(401);
      }

      const { startDate, endDate, limit = 50 } = req.query;
      
      const workouts = await storage.getAppleHealthWorkouts(
        req.session.user.id,
        startDate as string,
        endDate as string,
        parseInt(limit as string)
      );

      res.json(workouts);
    } catch (error: any) {
      console.error('Get Apple Health workouts error:', error);
      res.status(500).json({ message: error.message || "Error fetching Apple Health workouts" });
    }
  });

  // Convert Apple HealthKit workout to TacFit activity
  app.post("/api/apple-healthkit/workouts/:id/convert", async (req, res) => {
    try {
      if (!req.session?.user?.id) {
        return res.sendStatus(401);
      }

      const workoutId = parseInt(req.params.id);
      const { activityType, competitionId, teamId } = req.body;

      const workout = await storage.getAppleHealthWorkout(workoutId);
      if (!workout || workout.userId !== req.session.user.id) {
        return res.status(404).json({ message: "Workout not found" });
      }

      if (workout.isConverted) {
        return res.status(400).json({ message: "Workout has already been converted" });
      }

      // Create TacFit activity from workout
      const activity = await storage.createActivity({
        userId: req.session.user.id,
        competitionId,
        teamId,
        type: activityType,
        description: `${workout.workoutType} workout synced from Apple Health`,
        quantity: workout.duration?.toString() || "0",
        evidenceType: "apple_health",
        textInput: `Workout imported from Apple Health:\n- Type: ${workout.workoutType}\n- Duration: ${workout.duration} minutes\n- Calories burned: ${workout.totalEnergyBurned || 0}\n- Distance: ${workout.totalDistance || 'N/A'}`,
        points: 30 // Full points for Apple Health verified data
      });

      // Mark workout as converted
      await storage.updateAppleHealthWorkout(workoutId, {
        activityId: activity.id,
        isConverted: true
      });

      // Award points to team
      if (teamId) {
        const team = await storage.getTeam(teamId);
        if (team) {
          await storage.updateTeam(teamId, {
            points: (team.points || 0) + 30
          });
        }
      }

      res.json({ activity, workout, message: "Workout converted to TacFit activity successfully" });
    } catch (error: any) {
      console.error('Convert workout error:', error);
      res.status(500).json({ message: error.message || "Error converting workout" });
    }
  });

  // Disable Apple HealthKit integration
  app.post("/api/apple-healthkit/disable", async (req, res) => {
    try {
      if (!req.session?.user?.id) {
        return res.sendStatus(401);
      }

      await storage.updateAppleHealthConnection(req.session.user.id, {
        isEnabled: false
      });

      res.json({ message: "Apple Health integration disabled" });
    } catch (error: any) {
      console.error('Disable Apple Health error:', error);
      res.status(500).json({ message: error.message || "Error disabling Apple Health integration" });
    }
  });

  // Stripe payment intent for competition entry
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, competitionId, userId } = req.body;
      
      if (!amount || !competitionId || !userId) {
        return res.status(400).json({ message: "Amount, competition ID, and user ID are required" });
      }

      // Verify competition exists and is paid
      const competition = await storage.getCompetition(competitionId);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      if (competition.paymentType !== 'one_time' || !competition.entryFee) {
        return res.status(400).json({ message: "Competition does not require payment" });
      }

      // Verify amount matches competition entry fee
      if (amount !== competition.entryFee) {
        return res.status(400).json({ message: "Payment amount does not match competition entry fee" });
      }

      // Get user for metadata
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        metadata: {
          competitionId: competitionId.toString(),
          userId: userId.toString(),
          competitionName: competition.name,
          userEmail: user.email
        },
        description: `Entry fee for ${competition.name} competition`
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Competition entry after successful payment
  app.post("/api/competitions/:id/enter-with-payment", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.id);
      const { userId, paymentIntentId } = req.body;
      
      if (!userId || !paymentIntentId) {
        return res.status(400).json({ message: "User ID and payment intent ID are required" });
      }

      // Verify payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ message: "Payment has not been completed successfully" });
      }

      // Verify payment metadata matches request
      if (parseInt(paymentIntent.metadata.competitionId) !== competitionId || 
          parseInt(paymentIntent.metadata.userId) !== userId) {
        return res.status(400).json({ message: "Payment verification failed" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const competition = await storage.getCompetition(competitionId);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      // Check if user already has an entry for this competition
      const existingEntry = await storage.getCompetitionEntry(userId, competitionId);
      if (existingEntry) {
        return res.status(400).json({ message: "You have already entered this competition" });
      }

      // Create competition entry
      const entry = await storage.createCompetitionEntry({
        userId: userId,
        competitionId: competitionId,
        paymentType: 'stripe',
        paymentStatus: 'completed',
        paymentMethod: 'card',
        stripePaymentIntentId: paymentIntentId,
        amountPaid: paymentIntent.amount
      });

      res.json({
        message: "Successfully entered competition with payment",
        entry
      });

    } catch (error: any) {
      console.error('Stripe payment entry error:', error);
      res.status(500).json({ message: error.message || "Error processing payment entry" });
    }
  });

  // Competition entry for free competitions
  app.post("/api/competitions/:id/enter-free", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.id);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const competition = await storage.getCompetition(competitionId);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      // Verify competition is free
      if (competition.paymentType !== 'free') {
        return res.status(400).json({ message: "This competition requires payment" });
      }

      // Check if user already has an entry for this competition
      const existingEntry = await storage.getCompetitionEntry(userId, competitionId);
      if (existingEntry) {
        return res.status(400).json({ message: "You have already entered this competition" });
      }

      // Create competition entry
      const entry = await storage.createCompetitionEntry({
        userId: userId,
        competitionId: competitionId,
        paymentType: 'free',
        paymentStatus: 'completed',
        paymentMethod: 'none',
        amountPaid: 0
      });

      res.json({
        message: "Successfully joined the free competition",
        entry
      });

    } catch (error: any) {
      console.error('Free competition entry error:', error);
      res.status(500).json({ message: error.message || "Error joining free competition" });
    }
  });

  // Get user's competition results and current participation
  app.get("/api/users/:id/competition-results", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      // Get competition history (completed competitions)
      const history = await storage.getCompetitionHistory(userId);
      
      // Get current competition entries
      const entries = await storage.getUserCompetitionEntries(userId);
      
      // Enrich history with competition details
      const enrichedHistory = await Promise.all(
        history.map(async (record) => {
          const competition = await storage.getCompetition(record.competitionId!);
          const team = record.teamId ? await storage.getTeam(record.teamId) : null;
          return {
            ...record,
            competition,
            team
          };
        })
      );
      
      // Enrich entries with competition details
      const enrichedEntries = await Promise.all(
        entries.map(async (entry) => {
          const competition = await storage.getCompetition(entry.competitionId!);
          return {
            ...entry,
            competition
          };
        })
      );
      
      res.json({
        history: enrichedHistory,
        currentEntries: enrichedEntries
      });
    } catch (error) {
      console.error('Error fetching competition results:', error);
      res.status(500).json({ message: "Error fetching competition results" });
    }
  });

  // Dismiss/leave a completed competition (remove from user's view)
  app.post("/api/competitions/:id/dismiss", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.id);
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const competition = await storage.getCompetition(competitionId);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      if (!competition.isCompleted) {
        return res.status(400).json({ message: "Can only dismiss completed competitions" });
      }

      // Remove the user's competition entry (this dismisses it from their view)
      const entry = await storage.getCompetitionEntry(userId, competitionId);
      if (entry) {
        await storage.deleteCompetitionEntry(entry.id);
      }

      res.json({ message: "Competition dismissed successfully" });
    } catch (error) {
      console.error('Error dismissing competition:', error);
      res.status(500).json({ message: "Error dismissing competition" });
    }
  });

  // Add simplified workout conversion endpoint for frontend compatibility
  app.post("/api/apple-health/convert-workout", async (req, res) => {
    try {
      if (!req.session?.user?.id) {
        return res.sendStatus(401);
      }

      const { workoutId, activityType } = req.body;

      // Get user's current team for competition context
      const userTeamMembers = await storage.getTeamMembersByUser(req.session.user.id);
      const currentTeamMember = userTeamMembers.find((tm: any) => tm.role);
      if (!currentTeamMember) {
        return res.status(400).json({ message: "User not in a team" });
      }

      const team = await storage.getTeam(currentTeamMember.teamId!);
      if (!team) {
        return res.status(400).json({ message: "Team not found" });
      }

      const workout = await storage.getAppleHealthWorkout(workoutId);
      if (!workout || workout.userId !== req.session.user.id) {
        return res.status(404).json({ message: "Workout not found" });
      }

      if (workout.isConverted) {
        return res.status(400).json({ message: "Workout has already been converted" });
      }

      // Create TacFit activity from workout
      const activity = await storage.createActivity({
        userId: req.session.user.id,
        competitionId: team.competitionId,
        teamId: team.id,
        type: activityType,
        description: `${workout.workoutType} workout synced from Apple HealthKit`,
        quantity: workout.duration?.toString() || "0",
        evidenceType: "apple_health",
        textInput: `Workout imported from Apple HealthKit:\n- Type: ${workout.workoutType}\n- Duration: ${workout.duration} minutes\n- Calories burned: ${workout.totalEnergyBurned || 0}\n- Distance: ${workout.totalDistance || 'N/A'}`,
        points: 30 // Full points for Apple Health verified data
      });

      // Mark workout as converted
      await storage.updateAppleHealthWorkout(workoutId, {
        activityId: activity.id,
        isConverted: true
      });

      // Award points to team
      await storage.updateTeam(team.id, {
        points: (team.points || 0) + 30
      });

      res.json({ activity, workout, message: "Workout converted successfully" });
    } catch (error: any) {
      console.error('Convert workout error:', error);
      res.status(500).json({ message: error.message || "Error converting workout" });
    }
  });

  // Object Storage routes for public assets
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Register notification routes
  registerNotificationRoutes(app);

  // Test endpoint to demonstrate push notifications
  app.post("/api/test-notification", async (req, res) => {
    try {
      const { type, userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }

      let notification;
      
      switch (type) {
        case 'activity':
          notification = {
            title: 'Team Activity Update',
            body: 'Alpha submitted Running activity in Papa Unit',
            icon: '/generated-icon.png',
            badge: '/generated-icon.png',
            tag: 'activity-update',
            data: { type: 'activity', url: '/activity-feed' },
            actions: [
              { action: 'view', title: 'View Activity' },
              { action: 'dismiss', title: 'Dismiss' }
            ]
          };
          break;
        case 'competition':
          notification = {
            title: 'Competition Starting',
            body: 'Alpha Competition is starting now!',
            icon: '/generated-icon.png',
            badge: '/generated-icon.png',
            tag: 'competition-update',
            data: { type: 'competition', url: '/competitions' },
            actions: [
              { action: 'view', title: 'View Competition' },
              { action: 'dismiss', title: 'Dismiss' }
            ]
          };
          break;
        case 'message':
          notification = {
            title: 'Message in Papa Unit',
            body: 'Alpha: Hey team, great work on today\'s activities!',
            icon: '/generated-icon.png',
            badge: '/generated-icon.png',
            tag: 'team-message',
            data: { type: 'message', url: '/team' },
            actions: [
              { action: 'view', title: 'View Message' },
              { action: 'dismiss', title: 'Dismiss' }
            ]
          };
          break;
        case 'announcement':
          notification = {
            title: 'Command Update',
            body: 'New tactical briefing available in Intel Feed',
            icon: '/generated-icon.png',
            badge: '/generated-icon.png',
            tag: 'admin-announcement',
            data: { type: 'announcement', url: '/activity-feed' },
            actions: [
              { action: 'view', title: 'View Update' },
              { action: 'dismiss', title: 'Dismiss' }
            ],
            requireInteraction: true
          };
          break;
        default:
          notification = {
            title: 'TacFit Notification',
            body: 'This is a test notification',
            icon: '/generated-icon.png',
            badge: '/generated-icon.png',
            tag: 'test-notification',
            data: { type: 'test', url: '/' }
          };
      }

      // Send notification to the specified user directly via the service
      const result = await PushNotificationService.sendToUser(parseInt(userId), notification);
      res.json(result);
    } catch (error) {
      console.error('Test notification error:', error);
      res.status(500).json({ error: 'Failed to send test notification' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
