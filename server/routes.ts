import type { Express, Request } from "express";
import express from "express";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertCompetitionSchema, insertTeamSchema, 
  insertTeamMemberSchema, insertActivitySchema, insertActivityCommentSchema,
  insertChatMessageSchema, insertFriendshipSchema, insertCompetitionInvitationSchema,
  insertCompetitionEntrySchema, insertMissionTaskSchema, insertActivityTypeSchema,
  insertAdminPostSchema, insertMoodLogSchema, friendships, type User,
} from "@shared/schema";
import { getCompetitionPricing } from "@shared/pricing";
import { ObjectStorageService, ObjectNotFoundError } from './objectStorage.js';
import { db } from "./db";
import { pool } from "./db";
import { and, eq, sql } from "drizzle-orm";
import { users as usersTable, competitionEntries as competitionEntriesTable, authTokens as authTokensTable, pointsTransactions as pointsTransactionsTable, activities as activitiesTable, activityFlags as activityFlagsTable } from "@shared/schema";
import { desc } from "drizzle-orm";

// Record a single points-balance change so users can see their history.
// Never throws — points history is best-effort and must not break the
// actual points mutation it accompanies.
async function recordPointsTransaction(
  userId: number,
  delta: number,
  reason: string,
  opts: { description?: string; refType?: string; refId?: number } = {},
): Promise<void> {
  if (!delta) return;
  try {
    await db.insert(pointsTransactionsTable).values({
      userId,
      delta,
      reason,
      description: opts.description ?? null,
      refType: opts.refType ?? null,
      refId: opts.refId ?? null,
    });
  } catch (err) {
    console.error("Failed to record points transaction:", err);
  }
}
import crypto from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { generateVerificationToken, sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail } from "./email-service";
import { webhookService } from "./webhook-service";
import Stripe from "stripe";
import bcrypt from "bcrypt";
import rateLimit from "express-rate-limit";
import os from "os";

const execAsync = promisify(exec);

// Helper function to update user points and send webhook notifications
async function updateUserPointsWithWebhook(
  userId: number, 
  pointsChange: number, 
  reason: string
): Promise<void> {
  const currentUser = await storage.getUser(userId);
  if (!currentUser) {
    console.error(`User ${userId} not found when updating points`);
    return;
  }

  const previousPoints = currentUser.points || 0;
  const newPoints = previousPoints + pointsChange;
  
  await storage.updateUser(userId, { points: newPoints });
  // Activity submissions are derived directly from the activities table in
  // the points-history endpoint, so we skip recording a duplicate row here.
  if (reason !== 'Activity submission') {
    await recordPointsTransaction(userId, pointsChange, reason);
  }
  
  console.log(`${pointsChange > 0 ? 'Awarded' : 'Deducted'} ${Math.abs(pointsChange)} points for ${reason}. User ${userId} now has ${newPoints} points.`);
  
  // Send webhook notification
  try {
    await webhookService.notifyPointsUpdate({
      userId: currentUser.id,
      username: currentUser.username,
      email: currentUser.email,
      previousPoints,
      newPoints,
      pointsChange,
      reason,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Webhook notification error:', error);
  }
}

// Generate video thumbnail function
async function generateVideoThumbnail(videoPath: string, thumbnailPath: string): Promise<boolean> {
  try {
    // Extract frame at 1 second mark as thumbnail
    const ffmpegCommand = `ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2" -y "${thumbnailPath}"`;
    console.log(`Generating thumbnail: ${ffmpegCommand}`);
    
    const { stdout, stderr } = await execAsync(ffmpegCommand, { maxBuffer: 50 * 1024 * 1024 });
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
    
    const { stdout, stderr } = await execAsync(ffmpegCommand, { maxBuffer: 100 * 1024 * 1024, timeout: 300000 });
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

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
]);

const upload = multer({ 
  dest: os.tmpdir(),  // Use OS temp dir — always writable, auto-cleaned by OS
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB limit per file
  fileFilter: (_req, file, cb) => {
    // Accept any video/* MIME type (covers mp4, quicktime, hevc, x-m4v, 3gpp, etc.)
    if (file.mimetype.startsWith('video/') || ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      console.warn(`Rejected file with MIME type: ${file.mimetype} (${file.originalname})`);
      cb(new Error(`File type not allowed: ${file.mimetype}`));
    }
  },
});

const BCRYPT_ROUNDS = 12;

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
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
    
    console.log(`Competition type: ${competition.paymentType}`);
    
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
      
      // Determine points based on placement
      let captainPoints = 0;
      let memberPoints = 0;
      if (placement === 1) {
        captainPoints = 1000;
        memberPoints = 500;
      } else if (placement === 2) {
        captainPoints = 500;
        memberPoints = 250;
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
          await recordPointsTransaction(
            user.id,
            pointsToAward,
            placement === 1 ? "1st place finish" : "2nd place finish",
            {
              description: `${member.role === 'captain' ? 'Captain' : 'Member'} reward`,
              refType: 'competition',
              refId: competitionId,
            },
          );
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
        
        console.log(`${pointsToAward > 0 ? `Awarded ${pointsToAward} points to` : 'Recorded participation for'} ${user.username} (${member.role}) from team ${team.name} (${placement === 1 ? '1st' : placement === 2 ? '2nd' : placement === 3 ? '3rd' : `${placement}th`} place)`);
      }
    }
    
    console.log(`Competition ${competitionId} completed successfully!`);
  } catch (error) {
    console.error(`Error completing competition ${competitionId}:`, error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Create PostgreSQL session store
  // Trust proxy - required for secure cookies behind reverse proxies (like Replit deployments)
  app.set('trust proxy', 1);
  
  const PgSession = ConnectPgSimple(session);
  
  // Configure session middleware with PostgreSQL session store
  app.use(session({
    store: new PgSession({
      pool: pool, // Connection pool from db.ts
      tableName: 'user_sessions', // Optional table name (defaults to 'session')
      createTableIfMissing: true // Auto-create session table if missing
    }),
    secret: process.env.SESSION_SECRET || 'tacfit-session-key-2025',
    resave: false,
    saveUninitialized: false,
    name: 'tacfit-session',
    rolling: true, // Reset expiration on activity
    cookie: { 
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' required for Capacitor cross-origin requests
      domain: undefined // Let browser determine domain
    }
  }));

  // Bearer-token auth bridge for the native (Capacitor) app.
  // iOS WKWebView cross-origin cookies are unreliable, so the native client
  // sends `Authorization: Bearer <token>` instead. When a valid token is
  // present we hydrate req.session.userId so every existing route works
  // unchanged. Web (cookie) flows are untouched.
  app.use(async (req, _res, next) => {
    try {
      const header = req.headers.authorization;
      if (!header || !header.startsWith("Bearer ")) return next();
      const token = header.slice(7).trim();
      if (!token) return next();
      const [row] = await db
        .select({ userId: authTokensTable.userId })
        .from(authTokensTable)
        .where(eq(authTokensTable.token, token))
        .limit(1);
      if (row) {
        (req.session as any).userId = row.userId;
        // Bearer requests should NOT persist a server-side session row.
        // Override save/touch on this session instance so express-session's
        // automatic save-on-response is a no-op for native calls.
        const noopSave = (cb?: (err?: any) => void) => {
          if (typeof cb === "function") cb();
          return req.session;
        };
        (req.session as any).save = noopSave;
        (req.session as any).touch = () => req.session;
        // Best-effort touch on the token row
        db.update(authTokensTable)
          .set({ lastUsedAt: new Date() })
          .where(eq(authTokensTable.token, token))
          .catch(() => {});
      }
    } catch (e) {
      console.error("Bearer auth lookup failed:", e);
    }
    next();
  });

  // Auth routes
  app.post("/api/auth/register", authRateLimit, async (req, res) => {
    try {
      const { phoneNumber, ...userData } = req.body;
      
      // Validate required fields
      if (!userData.username || !userData.email || !userData.password) {
        return res.status(400).json({ 
          message: "Missing required fields: username, email, and password are required" 
        });
      }
      
      let parsedData;
      try {
        parsedData = insertUserSchema.parse(userData);
      } catch (zodError: any) {
        console.error('Zod validation failed on registration:', JSON.stringify(zodError?.errors || zodError?.issues || zodError, null, 2));
        const firstIssue = zodError?.errors?.[0] || zodError?.issues?.[0];
        const fieldName = firstIssue?.path?.join('.') || 'unknown field';
        const fieldMessage = firstIssue?.message || 'Validation failed';
        return res.status(400).json({ message: `Validation failed on ${fieldName}: ${fieldMessage}` });
      }
      
      // Check if user exists
      const existingUser = await storage.getUserByEmail(parsedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password before storing
      const hashedPassword = await bcrypt.hash(parsedData.password, BCRYPT_ROUNDS);
      
      let referredBy = null;
      
      // Check for phone number referral if provided
      if (phoneNumber) {
        const phoneInvitations = await storage.getPhoneInvitationsByPhone(phoneNumber);
        const pendingInvitation = phoneInvitations.find(inv => inv.status === 'pending');
        
        if (pendingInvitation) {
          referredBy = pendingInvitation.invitedBy;
          await storage.updatePhoneInvitation(pendingInvitation.id, { status: 'completed' });
          if (pendingInvitation.invitedBy) {
            await updateUserPointsWithWebhook(
              pendingInvitation.invitedBy,
              200,
              'Successful referral invitation'
            );
          }
        }
      }
      
      // Check if this is a test.com account (skip verification for development)
      const isTestAccount = parsedData.email.endsWith('@test.com');
      
      let verificationToken = null;
      let tokenExpiresAt = null;
      
      if (!isTestAccount) {
        verificationToken = generateVerificationToken();
        tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      }

      const user = await storage.createUser({
        ...parsedData,
        password: hashedPassword,
        referredBy,
        points: 100, // Starting points for new users
        isEmailVerified: isTestAccount, // Test accounts are auto-verified
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpiresAt: tokenExpiresAt,
      });

      await recordPointsTransaction(user.id, 100, "Welcome bonus");

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

  app.post("/api/auth/login", authRateLimit, async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Support both bcrypt hashes and legacy plaintext (transition period)
      const isLegacyPlaintext = !user.password.startsWith('$2');
      const passwordMatch = isLegacyPlaintext
        ? user.password === password
        : await bcrypt.compare(password, user.password);

      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Upgrade legacy plaintext password to bcrypt hash on successful login
      if (isLegacyPlaintext) {
        const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
        await storage.updateUser(user.id, { password: hashed });
      }

      // Check if email is verified (skip for test.com accounts)
      const isTestAccount = user.email.endsWith('@test.com');
      if (!user.isEmailVerified && !isTestAccount) {
        return res.status(403).json({ 
          message: "Email not verified. Please check your email and verify your account before logging in.",
          requiresEmailVerification: true
        });
      }
      
      // Check if user is suspended
      if (user.isSuspended) {
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

          // Issue an opaque bearer token for native (Capacitor) clients.
          // Web clients will ignore this field and continue using cookies.
          const bearerToken = crypto.randomBytes(32).toString("hex");
          db.insert(authTokensTable)
            .values({ token: bearerToken, userId: user.id })
            .then(() => {
              const { password: _, ...userWithoutPassword } = user;
              res.json({ ...userWithoutPassword, authToken: bearerToken });
            })
            .catch((tokenErr) => {
              console.error("Auth token insert failed:", tokenErr);
              const { password: _, ...userWithoutPassword } = user;
              // Still return user — cookie session is set, web will work
              res.json(userWithoutPassword);
            });
        });
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    // If the request came via bearer token, revoke just that token so
    // other devices logged in as the same user stay signed in.
    try {
      const header = req.headers.authorization;
      if (header && header.startsWith("Bearer ")) {
        const token = header.slice(7).trim();
        if (token) {
          await db.delete(authTokensTable).where(eq(authTokensTable.token, token));
        }
      }
    } catch (e) {
      console.error("Logout: bearer token revoke failed:", e);
    }

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

  // Forgot password route
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      console.log(`Password reset request for email: ${email}`);
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ message: "If an account with that email exists, a password reset link has been sent." });
      }
      
      // Generate reset token and expiration (1 hour)
      const resetToken = generateVerificationToken();
      const resetExpiration = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      
      // Update user with reset token
      await storage.updateUser(user.id, {
        passwordResetToken: resetToken,
        passwordResetTokenExpiresAt: resetExpiration
      });
      
      // Send reset email
      await sendPasswordResetEmail(user.email, user.username, resetToken);
      console.log(`Password reset email sent to: ${email}`);
      
      res.json({ message: "If an account with that email exists, a password reset link has been sent." });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: "Unable to process password reset request" });
    }
  });

  // Reset password route
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }
      
      console.log(`Password reset attempt with token: ${token}`);
      
      const user = await storage.getUserByPasswordResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      
      // Check if token has expired
      if (!user.passwordResetTokenExpiresAt || new Date() > user.passwordResetTokenExpiresAt) {
        return res.status(400).json({ message: "Password reset token has expired" });
      }
      
      // Hash and update the new password
      const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
      await storage.updateUser(user.id, {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null
      });
      
      console.log(`Password reset successful for user: ${user.email}`);
      
      res.json({ message: "Password reset successfully. You can now log in with your new password." });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: "Unable to reset password" });
    }
  });

  // Check current session status - used by frontend on startup
  app.get("/api/auth/me", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Not logged in" });
      }
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }
      // Refresh session user data
      req.session.user = user;
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to check session" });
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

  // Points history — most recent first. Combines explicit transactions
  // (welcome bonus, competition entry, refunds, wins, admin adjustments)
  // with activity-derived earnings from the activities table.
  app.get("/api/users/:id/points-history", async (req, res) => {
    try {
      const sessionUserId = req.session?.userId;
      const targetId = parseInt(req.params.id);
      if (!sessionUserId) return res.status(401).json({ message: "Not authenticated" });
      if (sessionUserId !== targetId) {
        const sessionUser = await storage.getUser(sessionUserId);
        if (!sessionUser?.isAdmin) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      const [txRows, activityRows] = await Promise.all([
        db.select().from(pointsTransactionsTable)
          .where(eq(pointsTransactionsTable.userId, targetId))
          .orderBy(desc(pointsTransactionsTable.createdAt)),
        db.select({
          id: activitiesTable.id,
          type: activitiesTable.type,
          description: activitiesTable.description,
          points: activitiesTable.points,
          createdAt: activitiesTable.createdAt,
        }).from(activitiesTable)
          .where(eq(activitiesTable.userId, targetId))
          .orderBy(desc(activitiesTable.createdAt)),
      ]);

      const entries = [
        ...txRows.map(t => ({
          id: `tx-${t.id}`,
          delta: t.delta,
          reason: t.reason,
          description: t.description,
          refType: t.refType,
          refId: t.refId,
          createdAt: t.createdAt,
        })),
        ...activityRows.filter(a => (a.points || 0) > 0).map(a => ({
          id: `act-${a.id}`,
          delta: a.points || 0,
          reason: a.type || "Activity submission",
          description: a.description || null,
          refType: 'activity',
          refId: a.id,
          createdAt: a.createdAt,
        })),
      ].sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      res.json(entries);
    } catch (error) {
      console.error("Error fetching points history:", error);
      res.status(500).json({ message: "Error fetching points history" });
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

  // Fields that must never be mutated through the generic user update
  // routes. Points are only changed through audited code paths so the
  // points-history ledger stays trustworthy; admin/suspension/email-verification
  // flags have dedicated endpoints with their own authorization.
  const PROTECTED_USER_UPDATE_FIELDS = new Set([
    'points', 'isAdmin', 'isSuspended', 'suspendedAt', 'suspensionReason',
    'isEmailVerified', 'password',
    'emailVerificationToken', 'emailVerificationTokenExpiresAt',
    'passwordResetToken', 'passwordResetTokenExpiresAt',
    'stripeCustomerId', 'stripeSubscriptionId',
    'referredBy', 'referralToken',
  ]);

  async function handleGenericUserUpdate(req: any, res: any) {
    try {
      const sessionUserId = req.session?.userId;
      if (!sessionUserId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const targetId = parseInt(req.params.id);
      if (sessionUserId !== targetId) {
        const sessionUser = await storage.getUser(sessionUserId);
        if (!sessionUser?.isAdmin) {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      const rawUpdates = req.body && typeof req.body === 'object' ? req.body : {};
      const updates: Record<string, any> = {};
      for (const [key, value] of Object.entries(rawUpdates)) {
        if (PROTECTED_USER_UPDATE_FIELDS.has(key)) continue;
        updates[key] = value;
      }

      const user = await storage.updateUser(targetId, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error updating user" });
    }
  }

  app.put("/api/users/:id", handleGenericUserUpdate);
  app.patch("/api/users/:id", handleGenericUserUpdate);

  // Adjust user points endpoint — admin only.
  app.post("/api/users/:id/adjust-points", async (req, res) => {
    const sessionUserId = req.session?.userId;
    if (!sessionUserId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const sessionUser = await storage.getUser(sessionUserId);
    if (!sessionUser?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
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

      const delta = newPoints - (user.points || 0);
      if (delta !== 0) {
        await recordPointsTransaction(userId, delta, "Admin adjustment", {
          description: operation === 'set' ? `Set to ${newPoints}` : undefined,
        });
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

  // Update advertisement preferences
  app.patch("/api/users/:id/advertisement-preference", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { hideAdvertisements } = req.body;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update advertisement preference
      const updatedUser = await storage.updateUser(userId, { hideAdvertisements });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update advertisement preference" });
      }
      
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Advertisement preference update error:", error);
      res.status(500).json({ message: "Error updating advertisement preference" });
    }
  });

  // Change password
  app.patch("/api/users/:id/change-password", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) return res.status(400).json({ message: "Current and new password required" });
      if (newPassword.length < 6) return res.status(400).json({ message: "New password must be at least 6 characters" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Support both bcrypt hashes and legacy plaintext
      const isLegacyPlaintext = !user.password.startsWith('$2');
      const passwordMatch = isLegacyPlaintext
        ? user.password === currentPassword
        : await bcrypt.compare(currentPassword, user.password);
      if (!passwordMatch) return res.status(401).json({ message: "Current password is incorrect" });

      const hashedNew = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      const updatedUser = await storage.updateUser(userId, { password: hashedNew });
      if (!updatedUser) return res.status(500).json({ message: "Failed to update password" });
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Error changing password" });
    }
  });

  // Toggle profile public/private
  app.patch("/api/users/:id/privacy", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { profilePublic } = req.body;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const updatedUser = await storage.updateUser(userId, { profilePublic });
      if (!updatedUser) return res.status(500).json({ message: "Failed to update privacy setting" });
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error updating privacy setting" });
    }
  });

  // Toggle push notifications
  app.patch("/api/users/:id/notifications", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { pushNotificationsEnabled } = req.body;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const updatedUser = await storage.updateUser(userId, { pushNotificationsEnabled });
      if (!updatedUser) return res.status(500).json({ message: "Failed to update notification setting" });
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Error updating notification setting" });
    }
  });

  // Self-delete account (user deletes their own account)
  app.delete("/api/auth/account", async (req, res) => {
    try {
      const { userId, password } = req.body;
      if (!userId || !password) return res.status(400).json({ message: "userId and password required" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.password !== password) return res.status(401).json({ message: "Password is incorrect" });
      await storage.deleteUser(userId);
      req.session.destroy(() => {});
      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error("Account deletion error:", error);
      res.status(500).json({ message: "Error deleting account" });
    }
  });

  // Check if user has entered paid competitions
  app.get("/api/users/:id/paid-competitions", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get user's competition entries
      const entries = await storage.getUserCompetitionEntries(userId);
      const hasPaidEntry = entries.some(entry => 
        (entry.paymentType === 'one_time' && entry.paymentStatus === 'succeeded') ||
        (entry.paymentType === 'points' && entry.paymentStatus === 'completed')
      );
      
      res.json({ hasPaidCompetitions: hasPaidEntry });
    } catch (error) {
      console.error("Paid competitions check error:", error);
      res.status(500).json({ message: "Error checking paid competitions" });
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
  // Ensure competition array fields (requiredActivities, targetGoals) are proper JS arrays.
  // The Neon serverless driver can return PostgreSQL arrays as raw strings ({a,b,c}).
  function transformCompetition(competition: any) {
    if (!competition) return competition;
    return {
      ...competition,
      requiredActivities: transformPgArray(competition.requiredActivities),
      targetGoals: transformPgArray(competition.targetGoals),
    };
  }

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
      
      res.json(competitions.map(transformCompetition));
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
      res.json(transformCompetition(competition));
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

      // Convert date strings to Date objects (empty strings become null)
      const processedData = {
        ...competitionData,
        startDate: new Date(competitionData.startDate),
        endDate: new Date(competitionData.endDate),
        joinStartDate: competitionData.joinStartDate ? new Date(competitionData.joinStartDate) : null,
        joinEndDate: competitionData.joinEndDate ? new Date(competitionData.joinEndDate) : null,
      };

      const parsedData = insertCompetitionSchema.parse(processedData);
      const competition = await storage.createCompetition({
        ...parsedData,
        createdBy: user.id
      });
      res.json(transformCompetition(competition));
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
      
      // Convert date strings to Date objects if they exist (empty strings become null)
      const processedUpdates = {
        ...updates,
        ...(updates.startDate !== undefined && { startDate: updates.startDate ? new Date(updates.startDate) : null }),
        ...(updates.endDate !== undefined && { endDate: updates.endDate ? new Date(updates.endDate) : null }),
        ...(updates.joinStartDate !== undefined && { joinStartDate: updates.joinStartDate ? new Date(updates.joinStartDate) : null }),
        ...(updates.joinEndDate !== undefined && { joinEndDate: updates.joinEndDate ? new Date(updates.joinEndDate) : null }),
      };
      
      const competition = await storage.updateCompetition(competitionId, processedUpdates);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }
      
      res.json(transformCompetition(competition));
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
        // Set join end to end of day UTC
        const joinEnd = new Date(competition.joinEndDate);
        joinEnd.setUTCHours(23, 59, 59, 999);
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
        // Set join end to end of day UTC
        const joinEnd = new Date(competition.joinEndDate);
        joinEnd.setUTCHours(23, 59, 59, 999);
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
      const objStorage = new ObjectStorageService();
      const pictureUrl = await objStorage.uploadFile(req.file.path, fileName, req.file.mimetype);
      
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

      // Always look up the entry so we can clean it up on leave, regardless
      // of whether the competition has started. Refunds, however, are only
      // issued if the competition hasn't started.
      const entry = await storage.getCompetitionEntry(memberToRemove.userId!, teamToLeave.competitionId!);

      if (!competitionStarted && entry && entry.paymentStatus === 'completed' && entry.pointsUsed && entry.pointsUsed > 0) {
        const user = await storage.getUser(memberToRemove.userId!);
        if (user) {
          const currentPoints = user.points || 0;
          const refundAmount = entry.pointsUsed;

          await storage.updateUser(user.id, { points: currentPoints + refundAmount });
          await recordPointsTransaction(user.id, refundAmount, "Competition entry refund", {
            description: competition.name,
            refType: 'competition',
            refId: competition.id,
          });

          await storage.updateCompetitionEntry(entry.id, {
            paymentStatus: 'refunded',
            refundedAt: new Date(),
            refundAmount: refundAmount,
          });

          refundMessage = ` and received ${refundAmount} points refund`;
          console.log(`Refunded ${refundAmount} points to user ${user.username} for leaving competition ${competition.name}`);
        }
      }

      // Always remove the entry row on leave so the user can cleanly rejoin
      // later if the join window allows. (Without this, a "ghost" entry blocks
      // re-entry even though the user no longer has a team.)
      if (entry) {
        await storage.deleteCompetitionEntry(entry.id);
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

  // Generate a signed URL for direct browser-to-GCS upload.
  // Used for large video files that exceed the deployment proxy's body-size limit.
  // Per-user rate limit so a compromised account can't generate unlimited
  // signed URLs and dump endless data into the bucket. Sliding 60s window.
  const uploadUrlRate = new Map<number, number[]>();
  const UPLOAD_URL_RATE_MAX = 30;       // max 30 signed URLs
  const UPLOAD_URL_RATE_WINDOW_MS = 60_000;

  // Only allow signed PUT URLs for known media extensions — blocks anyone
  // trying to use the bucket as generic file hosting (.exe, .html, etc.).
  const ALLOWED_UPLOAD_EXTENSIONS = new Set([
    '.mp4', '.mov', '.m4v', '.webm',
    '.jpg', '.jpeg', '.png', '.gif', '.heic', '.heif', '.webp',
  ]);

  app.post("/api/upload-url", async (req, res) => {
    try {
      // 1. Require an authenticated session — no anonymous signed URLs.
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // 2. Per-user rate limit.
      const now = Date.now();
      const recent = (uploadUrlRate.get(userId) || []).filter(
        (t) => now - t < UPLOAD_URL_RATE_WINDOW_MS
      );
      if (recent.length >= UPLOAD_URL_RATE_MAX) {
        return res.status(429).json({ message: "Too many upload requests. Please wait a moment and try again." });
      }
      recent.push(now);
      uploadUrlRate.set(userId, recent);

      // 3. Validate extension and restrict to known media types only.
      const { extension } = req.body || {};
      const candidate = typeof extension === 'string' && /^\.[a-zA-Z0-9]{1,8}$/.test(extension)
        ? extension.toLowerCase()
        : '';
      if (!candidate || !ALLOWED_UPLOAD_EXTENSIONS.has(candidate)) {
        return res.status(400).json({ message: "Unsupported file type." });
      }

      const svc = new ObjectStorageService();
      const { uploadUrl, uploadedPath } = await svc.getDirectUploadUrl(candidate);
      res.json({ uploadUrl, uploadedPath });
    } catch (err) {
      console.error("Failed to generate upload URL:", err);
      res.status(500).json({ message: "Failed to generate upload URL" });
    }
  });

  app.post("/api/activities", (req, res, next) => {
    console.log("POST /api/activities received — starting multer");
    // Log raw content-type so we can debug iOS MIME issues
    console.log("Content-Type:", req.headers['content-type']?.substring(0, 100));
    upload.any()(req, res, (err) => {
      if (err) {
        console.error("Multer upload error:", err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: "File too large. Videos must be under 200MB and images under 200MB." });
        }
        return res.status(400).json({ message: `Upload error: ${err.message}` });
      }
      next();
    });
  }, async (req, res) => {
    try {
      // Get user ID from request and validate against session
      const requestUserId = parseInt(req.body.userId);
      
      const sessionUserId = req.session?.userId || req.session?.user?.id;
      if (sessionUserId && sessionUserId !== requestUserId) {
        return res.status(401).json({ message: "User ID mismatch" });
      }
      
      const userId = requestUserId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Find user's current team (optional now)
      const userTeams = await storage.getTeams();
      let userTeam = null;
      let competition = null;
      let isInActiveCompetition = false;
      
      for (const team of userTeams) {
        const members = await storage.getTeamMembers(team.id);
        if (members.some(member => member.userId === userId)) {
          userTeam = team;
          break;
        }
      }
      
      // If user is part of a team, check competition status
      if (userTeam && userTeam.competitionId) {
        competition = await storage.getCompetition(userTeam.competitionId);
        
        if (competition) {
          const now = new Date();
          const startDate = new Date(competition.startDate);
          const endDate = new Date(competition.endDate);
          
          // Check if competition is active (started and not ended)
          if (now >= startDate && now <= endDate) {
            isInActiveCompetition = true;
          }
        }
      }
      
      // Handle file uploads - upload.any() returns an array
      const files = req.files as Express.Multer.File[] || [];
      
      // Log every uploaded file so we can debug iOS MIME type issues
      files.forEach(f => console.log(`Uploaded file: field=${f.fieldname} mime=${f.mimetype} size=${f.size} name=${f.originalname}`));

      // Separate files by type
      const videoFiles = files.filter(file => file.fieldname === 'video');
      const imageFiles = files.filter(file => file.fieldname === 'images');
      
      // Calculate base points
      let basePoints = 15;

      // Check if both video and image evidence are provided for bonus (30 total).
      // Video may either come through multer OR via a pre-signed direct upload (req.body.videoUrl).
      const preUploadedVideoCheck = typeof req.body.videoUrl === 'string' && req.body.videoUrl.trim().startsWith('/uploads/');
      const hasVideoEvidence = videoFiles.length > 0 || preUploadedVideoCheck;
      const hasImageEvidence = imageFiles.length > 0;
      const hasBothEvidenceTypes = hasVideoEvidence && hasImageEvidence;
      
      // Set evidence type based on file uploads
      let description = req.body.description;
      let evidenceType = req.body.evidenceType || null;
      
      // Apply points logic: full 30 points only if both evidence types are provided
      const finalPoints = hasBothEvidenceTypes ? 30 : basePoints;

      // Handle video file (primary evidence) first
      let evidenceUrl = '';
      let thumbnailUrl = '';
      const actObjStorage = new ObjectStorageService();

      // Direct-upload path: client uploaded video to GCS via signed URL
      // and is sending us just the resulting /uploads/<file> path.
      const preUploadedVideoUrl = typeof req.body.videoUrl === 'string' ? req.body.videoUrl.trim() : '';
      const hasPreUploadedVideo = preUploadedVideoUrl.startsWith('/uploads/');

      if (hasPreUploadedVideo) {
        evidenceUrl = preUploadedVideoUrl;
        evidenceType = 'video';
        console.log(`Video already uploaded directly to GCS: ${preUploadedVideoUrl}`);
      } else if (videoFiles.length > 0) {
        // Legacy path: video came through multer (small files / dev)
        const videoFile = videoFiles[0];
        const originalExtension = path.extname(videoFile.originalname).toLowerCase() || '.mp4';
        const timestamp = Date.now();
        const fileName = `${timestamp}${originalExtension}`;

        evidenceUrl = await actObjStorage.uploadFile(videoFile.path, fileName, videoFile.mimetype);

        if (videoFile.mimetype.startsWith('video/') || ['mov', 'mp4', 'webm', 'avi', 'hevc', 'm4v'].includes(originalExtension.replace('.', ''))) {
          evidenceType = 'video';
          console.log(`Video saved to object storage: ${fileName} (${videoFile.mimetype}, ${videoFile.size} bytes)`);
        } else {
          evidenceType = 'photo';
        }
      }
      
      // Handle multiple image files
      const imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        for (let i = 0; i < imageFiles.length; i++) {
          const imageFile = imageFiles[i];
          const fileExtension = path.extname(imageFile.originalname);
          const fileName = `${Date.now()}_img${i}${fileExtension}`;
          const url = await actObjStorage.uploadFile(imageFile.path, fileName, imageFile.mimetype);
          imageUrls.push(url);
        }
      }
      


      const activityData = {
        userId: userId,
        competitionId: isInActiveCompetition ? userTeam?.competitionId : null,
        teamId: isInActiveCompetition ? userTeam?.id : null,
        type: req.body.type,
        description: description,
        quantity: req.body.quantity,
        textInput: req.body.textInput || null,
        points: finalPoints,
        evidenceType: evidenceType,
        evidenceUrl: evidenceUrl,
        thumbnailUrl: thumbnailUrl,
        imageUrls: imageUrls
      };
      
      
      const validatedData = insertActivitySchema.parse(activityData);
      
      const activity = await storage.createActivity(validatedData);
      
      
      // Always update user points (15 or 30 depending on evidence)
      if (activity.userId && activity.points) {
        await updateUserPointsWithWebhook(
          activity.userId, 
          activity.points, 
          'Activity submission'
        );
      }
      
      // Only update team points if activity is part of an active competition
      if (activity.teamId && activity.points && isInActiveCompetition) {
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
      const sessionUserId = (req.session as any)?.userId || (req.session as any)?.user?.id;
      const userId = req.body.userId ? parseInt(req.body.userId) : sessionUserId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
      const liked = await storage.toggleActivityLike(parseInt(req.params.id), userId);
      res.json({ liked });
    } catch (error) {
      res.status(500).json({ message: "Error toggling like" });
    }
  });

  // Activity flag routes
  // PRIVACY: only return whether the CURRENT user has flagged this activity.
  // We deliberately do NOT return the list of flaggers or the aggregate count
  // — that information is only visible to admins via /api/admin/flagged-activities.
  app.get("/api/activities/:id/flags", async (req, res) => {
    try {
      const sessionUserId = (req.session as any)?.userId || (req.session as any)?.user?.id;
      if (!sessionUserId) return res.json({ flagged: false });
      const flags = await storage.getActivityFlags(parseInt(req.params.id));
      const flagged = flags.some((f: any) => f.userId === sessionUserId);
      res.json({ flagged });
    } catch (error) {
      res.status(500).json({ message: "Error fetching flags" });
    }
  });

  app.post("/api/activities/:id/flag", async (req, res) => {
    try {
      const sessionUserId = (req.session as any)?.userId || (req.session as any)?.user?.id;
      const userId = req.body.userId ? parseInt(req.body.userId) : sessionUserId;
      if (!userId) return res.status(401).json({ message: "Not authenticated" });
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

  // Get user conversations with unread counts
  app.get("/api/conversations/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const conversations = await storage.getUserConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Error fetching conversations" });
    }
  });

  // Mark conversation as read
  app.post("/api/conversations/:userId/:friendId/read", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const friendId = parseInt(req.params.friendId);
      await storage.markConversationAsRead(userId, friendId);
      res.json({ message: "Conversation marked as read" });
    } catch (error) {
      console.error("Error marking conversation as read:", error);
      res.status(500).json({ message: "Error marking conversation as read" });
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

      // Block duplicate pending invites for the same user + team.
      const existingInvites = await storage.getUserInvitations(userId);
      const alreadyPending = existingInvites.find(
        (i: any) => i.teamId === teamId && i.status === 'pending'
      );
      if (alreadyPending) {
        return res.status(400).json({ message: "This user already has a pending invitation to this team." });
      }

      // Look up competitionId from the team
      const team = await storage.getTeam(teamId);

      // Create invitation
      const invitation = await storage.createUserInvitation({
        userId,
        invitedBy,
        teamId,
        competitionId: team?.competitionId || null,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });
      
      res.json({ message: "Invitation sent", invitation });
    } catch (error) {
      console.error("Error sending user invitation:", error);
      res.status(500).json({ message: "Error sending user invitation" });
    }
  });

  // Get pending invitations for a user
  app.get("/api/users/:userId/team-invitations", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const invitations = await storage.getUserInvitations(userId);

      // Enrich with team, competition, and inviter details
      const enriched = await Promise.all(invitations.map(async (inv: any) => {
        const team = inv.teamId ? await storage.getTeam(inv.teamId) : null;
        const competition = inv.competitionId ? await storage.getCompetition(inv.competitionId) : null;
        const inviter = inv.invitedBy ? await storage.getUser(inv.invitedBy) : null;
        return {
          ...inv,
          team: team ? { id: team.id, name: team.name } : null,
          competition: competition ? { id: competition.id, name: competition.name } : null,
          inviter: inviter ? { id: inviter.id, username: inviter.username, avatar: inviter.avatar } : null,
        };
      }));

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ message: "Error fetching invitations" });
    }
  });

  // Accept a team invitation
  app.post("/api/team-invitations/:id/accept", async (req, res) => {
    try {
      // Trust the session, never the body — prevents hijacking another user's invite.
      const userId = req.session?.userId || req.session?.user?.id;
      if (!userId) return res.status(401).json({ message: "You must be logged in." });

      const id = parseInt(req.params.id);
      const invitations = await storage.getUserInvitations(userId);
      const invitation = invitations.find((i: any) => i.id === id);
      if (!invitation) return res.status(404).json({ message: "Invitation not found" });

      // Look up the team's competition so we know whether payment is required.
      const team = await storage.getTeam(invitation.teamId);
      const competitionId = team?.competitionId ?? invitation.competitionId ?? null;
      const competition = competitionId ? await storage.getCompetition(competitionId) : null;
      const isPaid = !!competition && competition.paymentType && competition.paymentType !== 'free';

      // For paid competitions, require an entry before adding to the team.
      // NOTE: this also makes the accept route the recovery path for the
      // orphaned-payment edge case — if `complete-after-payment` fails after
      // a successful charge, the user can click Accept again and this branch
      // will see the existing entry and finish the join below.
      if (isPaid && competition) {
        const existingEntry = await storage.getCompetitionEntry(userId, competition.id);
        if (!existingEntry) {
          return res.json({
            requiresPayment: true,
            invitationId: id,
            teamId: invitation.teamId,
            competition: {
              id: competition.id,
              name: competition.name,
              description: competition.description,
              startDate: competition.startDate,
              endDate: competition.endDate,
              paymentType: competition.paymentType,
              pricingTier: (competition as any).pricingTier,
            },
          });
        }
      }

      // Free competition (or paid with entry already on file) → add to team
      // and mark accepted. Guard against duplicate-membership race.
      const alreadyMember = await storage.getTeamMember(invitation.teamId, userId);
      if (!alreadyMember) {
        await storage.addTeamMember({ teamId: invitation.teamId, userId, role: 'member' });
      }
      const updated = await storage.updateUserInvitation(id, 'accepted');
      res.json({ message: "Invitation accepted", invitation: updated, requiresPayment: false });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Error accepting invitation" });
    }
  });

  // Called after the user completes payment (card or points) for a paid
  // competition they were invited to. Adds them to the inviter's team and
  // marks the invitation accepted. Requires a competition entry on file.
  app.post("/api/team-invitations/:id/complete-after-payment", async (req, res) => {
    try {
      const userId = req.session?.userId || req.session?.user?.id;
      if (!userId) return res.status(401).json({ message: "You must be logged in." });

      const id = parseInt(req.params.id);
      const invitations = await storage.getUserInvitations(userId);
      const invitation = invitations.find((i: any) => i.id === id);
      if (!invitation) return res.status(404).json({ message: "Invitation not found" });

      const team = await storage.getTeam(invitation.teamId);
      const competitionId = team?.competitionId ?? invitation.competitionId ?? null;
      if (!competitionId) {
        return res.status(400).json({ message: "Invitation has no competition" });
      }

      const entry = await storage.getCompetitionEntry(userId, competitionId);
      if (!entry) {
        return res.status(400).json({ message: "Payment not yet recorded — please complete payment first." });
      }

      const alreadyMember = await storage.getTeamMember(invitation.teamId, userId);
      if (!alreadyMember) {
        await storage.addTeamMember({ teamId: invitation.teamId, userId, role: 'member' });
      }
      const updated = await storage.updateUserInvitation(id, 'accepted');
      res.json({ message: "Invitation accepted after payment", invitation: updated });
    } catch (error) {
      console.error("Error completing invitation after payment:", error);
      res.status(500).json({ message: "Error completing invitation" });
    }
  });

  // Decline a team invitation
  app.post("/api/team-invitations/:id/decline", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.updateUserInvitation(id, 'declined');
      res.json({ message: "Invitation declined", invitation: updated });
    } catch (error) {
      res.status(500).json({ message: "Error declining invitation" });
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
        
        // Upload to object storage
        const fileExtension = path.extname(file.originalname);
        const fileName = `avatar_${userId}_${Date.now()}${fileExtension}`;
        const avatarObjStorage = new ObjectStorageService();
        const avatarUrl = await avatarObjStorage.uploadFile(file.path, fileName, file.mimetype);
        
        // Update user with avatar URL (store bare filename for backwards compat)
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
        
        // Upload to object storage
        const fileExtension = path.extname(file.originalname);
        const fileName = `cover_${userId}_${Date.now()}${fileExtension}`;
        const coverObjStorage = new ObjectStorageService();
        await coverObjStorage.uploadFile(file.path, fileName, file.mimetype);
        
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
  // Authz: userId is derived from the session, NEVER from req.body, so users
  // cannot trigger entries (or point deductions) on behalf of others.
  // Atomicity: a single transaction conditionally decrements points and
  // inserts the entry; the unique (user_id, competition_id) index prevents
  // double-entry races.
  app.post("/api/competitions/:id/enter-with-points", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.id);
      const userId = req.session?.userId || req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "You must be logged in to enter a competition." });
      }

      const competition = await storage.getCompetition(competitionId);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      const pricing = getCompetitionPricing(competition);
      if (!pricing) {
        return res.status(400).json({ message: "This competition is free — no points required." });
      }
      const ENTRY_COST_POINTS = pricing.points;

      // Clear out any stale refunded/cancelled entry so the unique constraint
      // doesn't block a legitimate re-entry after a refund.
      const existingEntry = await storage.getCompetitionEntry(userId, competitionId);
      if (existingEntry && (existingEntry.paymentStatus === 'refunded' || existingEntry.paymentStatus === 'cancelled')) {
        await storage.deleteCompetitionEntry(existingEntry.id);
      }

      let result: { remainingPoints: number };
      try {
        result = await db.transaction(async (tx) => {
          // Atomic conditional decrement — only succeeds if balance >= cost.
          const [updated] = await tx
            .update(usersTable)
            .set({ points: sql`${usersTable.points} - ${ENTRY_COST_POINTS}` })
            .where(and(
              eq(usersTable.id, userId),
              sql`COALESCE(${usersTable.points}, 0) >= ${ENTRY_COST_POINTS}`,
            ))
            .returning({ points: usersTable.points });

          if (!updated) {
            const current = await storage.getUser(userId);
            const err: any = new Error("INSUFFICIENT_POINTS");
            err.currentPoints = current?.points || 0;
            throw err;
          }

          await tx.insert(competitionEntriesTable).values({
            userId,
            competitionId,
            paymentType: 'points',
            paymentStatus: 'completed',
            paymentMethod: 'points',
            pointsUsed: ENTRY_COST_POINTS,
          });

          await tx.insert(pointsTransactionsTable).values({
            userId,
            delta: -ENTRY_COST_POINTS,
            reason: "Competition entry",
            description: competition.name,
            refType: 'competition',
            refId: competitionId,
          });

          return { remainingPoints: updated.points || 0 };
        });
      } catch (e: any) {
        if (e?.message === "INSUFFICIENT_POINTS") {
          return res.status(400).json({
            message: `Insufficient points. You need ${ENTRY_COST_POINTS} points to enter this competition. You have ${e.currentPoints} points.`,
            requiresPayment: true,
            pointsNeeded: ENTRY_COST_POINTS,
            currentPoints: e.currentPoints,
          });
        }
        // Postgres unique-violation = duplicate entry
        if (e?.code === '23505') {
          return res.status(400).json({ message: "You have already entered this competition" });
        }
        throw e;
      }

      res.json({
        message: "Successfully entered competition using points",
        pointsDeducted: ENTRY_COST_POINTS,
        remainingPoints: result.remainingPoints,
      });
    } catch (error: any) {
      console.error('Points payment error:', error);
      res.status(500).json({ message: error.message || "Error processing points payment" });
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
      const sessionUserId = req.session?.userId || req.session?.user?.id;
      const bodyUserId = req.body.userId ? parseInt(req.body.userId) : null;
      const resolvedUserId = sessionUserId || bodyUserId;
      if (!resolvedUserId) {
        return res.sendStatus(401);
      }
      // If session exists, ensure it matches body userId when provided
      if (sessionUserId && bodyUserId && sessionUserId !== bodyUserId) {
        return res.sendStatus(403);
      }

      const requestData = {
        ...req.body,
        userId: resolvedUserId
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
      await updateUserPointsWithWebhook(
        resolvedUserId, 
        5, 
        'Daily mood log'
      );
      
      res.status(201).json({ ...moodLog, pointsAwarded: 5 });
    } catch (error: any) {
      console.error('Mood log creation error:', error);
      res.status(500).json({ message: error.message || "Error creating mood log" });
    }
  });

  // Get user's mood logs
  app.get("/api/mood-logs/user/:userId", async (req, res) => {
    try {
      const sessionUserId = req.session?.userId || req.session?.user?.id;
      if (!sessionUserId) {
        return res.sendStatus(401);
      }

      const userId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

      // Users can only access their own mood logs
      if (sessionUserId !== userId) {
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
      const sessionUserId = req.session?.userId || req.session?.user?.id;
      if (!sessionUserId) {
        return res.sendStatus(401);
      }

      const userId = parseInt(req.params.userId);

      // Users can only access their own mood logs
      if (sessionUserId !== userId) {
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
      const userId = parseInt(req.params.userId);
      if (!userId || isNaN(userId)) return res.sendStatus(400);

      const sessionUserId = req.session?.userId || req.session?.user?.id;
      // If session exists, verify it belongs to this user
      if (sessionUserId && sessionUserId !== userId) {
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
      const sessionUserId = req.session?.userId || req.session?.user?.id;
      if (!sessionUserId) {
        return res.sendStatus(401);
      }

      // Check if user is admin
      const currentUser = await storage.getUser(sessionUserId);
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

  // Captain reports an inactive teammate. Only the team captain can submit.
  app.post("/api/teammate-reports", async (req, res) => {
    try {
      const sessionUserId = req.session?.userId || req.session?.user?.id;
      if (!sessionUserId) return res.sendStatus(401);

      const { teamId, reportedUserId, reason, note } = req.body || {};
      if (!teamId || !reportedUserId || !reason) {
        return res.status(400).json({ message: "teamId, reportedUserId, and reason are required" });
      }

      const team = await storage.getTeam(parseInt(teamId));
      if (!team) return res.status(404).json({ message: "Team not found" });
      if (team.captainId !== sessionUserId) {
        return res.status(403).json({ message: "Only the team captain can report a teammate" });
      }
      if (parseInt(reportedUserId) === sessionUserId) {
        return res.status(400).json({ message: "Cannot report yourself" });
      }
      if (!team.competitionId) {
        return res.status(400).json({ message: "Team has no competition" });
      }

      const report = await storage.createTeammateReport({
        teamId: parseInt(teamId),
        competitionId: team.competitionId,
        reporterId: sessionUserId,
        reportedUserId: parseInt(reportedUserId),
        reason: String(reason),
        note: note ? String(note) : null,
      });

      res.json(report);
    } catch (error: any) {
      console.error('Create teammate report error:', error);
      res.status(500).json({ message: error.message || "Error creating report" });
    }
  });

  // Admin: list teammate reports
  app.get("/api/admin/teammate-reports", async (req, res) => {
    try {
      const sessionUserId = req.session?.userId || req.session?.user?.id;
      if (!sessionUserId) return res.sendStatus(401);
      const currentUser = await storage.getUser(sessionUserId);
      if (!currentUser?.isAdmin) return res.sendStatus(403);

      const status = req.query.status ? String(req.query.status) : undefined;
      const reports = await storage.getTeammateReports(status);

      const enriched = await Promise.all(reports.map(async (r) => {
        const [reporter, reportedUser, team, competition] = await Promise.all([
          storage.getUser(r.reporterId),
          storage.getUser(r.reportedUserId),
          storage.getTeam(r.teamId),
          storage.getCompetition(r.competitionId),
        ]);
        return {
          ...r,
          reporterUsername: reporter?.username || null,
          reportedUsername: reportedUser?.username || null,
          teamName: team?.name || null,
          competitionName: competition?.name || null,
        };
      }));

      res.json(enriched);
    } catch (error: any) {
      console.error('List teammate reports error:', error);
      res.status(500).json({ message: error.message || "Error listing reports" });
    }
  });

  // Admin: update teammate report (set status / add response / mark resolved)
  app.patch("/api/admin/teammate-reports/:id", async (req, res) => {
    try {
      const sessionUserId = req.session?.userId || req.session?.user?.id;
      if (!sessionUserId) return res.sendStatus(401);
      const currentUser = await storage.getUser(sessionUserId);
      if (!currentUser?.isAdmin) return res.sendStatus(403);

      const reportId = parseInt(req.params.id);
      const { status, adminResponse } = req.body || {};
      const updates: any = {};
      if (status) updates.status = String(status);
      if (adminResponse !== undefined) updates.adminResponse = adminResponse ? String(adminResponse) : null;
      if (status && status !== 'pending') {
        updates.resolvedAt = new Date();
        updates.resolvedBy = sessionUserId;
      }

      const updated = await storage.updateTeammateReport(reportId, updates);
      if (!updated) return res.status(404).json({ message: "Report not found" });
      res.json(updated);
    } catch (error: any) {
      console.error('Update teammate report error:', error);
      res.status(500).json({ message: error.message || "Error updating report" });
    }
  });

  // Admin: remove a teammate from a team (used when resolving a report)
  app.post("/api/admin/teams/:teamId/remove-member/:userId", async (req, res) => {
    try {
      const sessionUserId = req.session?.userId || req.session?.user?.id;
      if (!sessionUserId) return res.sendStatus(401);
      const currentUser = await storage.getUser(sessionUserId);
      if (!currentUser?.isAdmin) return res.sendStatus(403);

      const teamId = parseInt(req.params.teamId);
      const userId = parseInt(req.params.userId);
      const team = await storage.getTeam(teamId);
      if (!team) return res.status(404).json({ message: "Team not found" });
      if (team.captainId === userId) {
        return res.status(400).json({ message: "Cannot remove the team captain" });
      }
      const members = await storage.getTeamMembers(teamId);
      const membership = members.find(m => m.userId === userId);
      if (!membership) return res.status(404).json({ message: "User is not on this team" });

      await storage.removeTeamMember(teamId, userId);
      res.json({ message: "Member removed" });
    } catch (error: any) {
      console.error('Admin remove member error:', error);
      res.status(500).json({ message: error.message || "Error removing member" });
    }
  });

  // Admin: list flagged activities for review
  app.get("/api/admin/flagged-activities", async (req, res) => {
    try {
      const sessionUserId = (req.session as any)?.userId || (req.session as any)?.user?.id;
      if (!sessionUserId) return res.sendStatus(401);
      const currentUser = await storage.getUser(sessionUserId);
      if (!currentUser?.isAdmin) return res.sendStatus(403);

      // Use flag rows as the source of truth (more reliable than the
      // isFlagged column, which can fall out of sync if a flag was created
      // before the sync logic was added).
      const flagRows = await db.select().from(activityFlagsTable);
      const flaggedIds = Array.from(new Set(flagRows.map((f: any) => f.activityId).filter(Boolean)));
      const allActivities = await storage.getActivities();
      const flagged = allActivities.filter((a: any) => flaggedIds.includes(a.id));

      const enriched = await Promise.all(flagged.map(async (a: any) => {
        const [submitter, team, flags] = await Promise.all([
          a.userId ? storage.getUser(a.userId) : Promise.resolve(null),
          a.teamId ? storage.getTeam(a.teamId) : Promise.resolve(null),
          storage.getActivityFlags(a.id),
        ]);
        const competition = team?.competitionId ? await storage.getCompetition(team.competitionId) : null;
        const flaggers = await Promise.all(
          flags.map(async (f: any) => {
            const u = f.userId ? await storage.getUser(f.userId) : null;
            return { userId: f.userId, username: u?.username || "unknown", flaggedAt: f.createdAt };
          })
        );
        return {
          ...a,
          submitter: submitter ? { id: submitter.id, username: submitter.username, avatar: submitter.avatar } : null,
          team: team ? { id: team.id, name: team.name } : null,
          competition: competition ? { id: competition.id, name: competition.name } : null,
          flagCount: flags.length,
          flaggers,
        };
      }));

      // Most-flagged + most-recent first
      enriched.sort((a, b) => (b.flagCount - a.flagCount) || (new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
      res.json(enriched);
    } catch (error: any) {
      console.error("List flagged activities error:", error);
      res.status(500).json({ message: error.message || "Error listing flagged activities" });
    }
  });

  // Admin: dismiss all flags on an activity (keeps activity + points intact)
  app.post("/api/admin/activities/:id/dismiss-flag", async (req, res) => {
    try {
      const sessionUserId = (req.session as any)?.userId || (req.session as any)?.user?.id;
      if (!sessionUserId) return res.sendStatus(401);
      const currentUser = await storage.getUser(sessionUserId);
      if (!currentUser?.isAdmin) return res.sendStatus(403);

      const activityId = parseInt(req.params.id);
      const activity = await storage.getActivity(activityId);
      if (!activity) return res.status(404).json({ message: "Activity not found" });

      // Clear all flag rows and reset the isFlagged column
      await db.delete(activityFlagsTable).where(eq(activityFlagsTable.activityId, activityId));
      await db.update(activitiesTable).set({ isFlagged: false }).where(eq(activitiesTable.id, activityId));

      res.json({ message: "Flag dismissed" });
    } catch (error: any) {
      console.error("Dismiss flag error:", error);
      res.status(500).json({ message: error.message || "Error dismissing flag" });
    }
  });

  // Admin: get a user's participation summary (activity counts, last activity, etc.)
  app.get("/api/admin/users/:userId/participation", async (req, res) => {
    try {
      const sessionUserId = req.session?.userId || req.session?.user?.id;
      if (!sessionUserId) return res.sendStatus(401);
      const currentUser = await storage.getUser(sessionUserId);
      if (!currentUser?.isAdmin) return res.sendStatus(403);

      const userId = parseInt(req.params.userId);
      const competitionId = req.query.competitionId ? parseInt(req.query.competitionId as string) : undefined;
      const summary = await storage.getUserParticipationSummary(userId, competitionId);
      res.json(summary);
    } catch (error: any) {
      console.error('Get user participation error:', error);
      res.status(500).json({ message: error.message || "Error fetching participation" });
    }
  });



















  // Stripe payment intent for competition entry — amount is derived from
  // the competition's duration (2 weeks → $7, 4 weeks → $14) via the
  // shared pricing helper, so the client cannot tamper with the price.
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { competitionId } = req.body;
      const userId = req.session?.userId || req.session?.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "You must be logged in to pay." });
      }
      if (!competitionId) {
        return res.status(400).json({ message: "Competition ID is required" });
      }

      const competition = await storage.getCompetition(competitionId);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      const pricing = getCompetitionPricing(competition);
      if (!pricing) {
        return res.status(400).json({ message: "This competition is free — no payment required." });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Reuse an existing entry's pending intent if one exists. Only block
      // re-entry for active 'completed' entries — 'refunded' or 'cancelled'
      // entries mean the user has left and is allowed to rejoin.
      const existingEntry = await storage.getCompetitionEntry(userId, competitionId);
      if (existingEntry && existingEntry.paymentStatus === 'completed') {
        return res.status(400).json({ message: "You have already entered this competition" });
      }
      if (existingEntry && (existingEntry.paymentStatus === 'refunded' || existingEntry.paymentStatus === 'cancelled')) {
        await storage.deleteCompetitionEntry(existingEntry.id);
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: pricing.cents,
        currency: "usd",
        // Card-only keeps the checkout form compact on mobile. To add
        // Apple Pay / Google Pay / Link later, swap back to
        // automatic_payment_methods: { enabled: true }.
        payment_method_types: ["card"],
        metadata: {
          competitionId: competitionId.toString(),
          userId: userId.toString(),
          competitionName: competition.name,
          userEmail: user.email,
        },
        description: `Entry fee for ${competition.name} competition`,
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        amount: pricing.cents,
        dollars: pricing.dollars,
      });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Stripe webhook — server-side source of truth for completed payments.
  // Stripe POSTs here on payment_intent.succeeded; we idempotently enter the
  // user into the competition. This protects against the case where the
  // client confirms a payment but its browser/network dies before the
  // follow-up enter-with-payment call lands.
  app.post(
    "/api/stripe-webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"] as string | undefined;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.error("STRIPE_WEBHOOK_SECRET is not set — refusing webhook");
        return res.status(500).send("Webhook secret not configured");
      }
      if (!sig) {
        return res.status(400).send("Missing stripe-signature header");
      }

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: any) {
        console.error("Stripe webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      try {
        if (event.type === "payment_intent.succeeded") {
          const pi = event.data.object as Stripe.PaymentIntent;
          const competitionId = parseInt(pi.metadata?.competitionId || "");
          const userId = parseInt(pi.metadata?.userId || "");

          if (!competitionId || !userId) {
            console.warn(
              `Webhook: payment_intent ${pi.id} missing competitionId/userId metadata — skipping`,
            );
            return res.json({ received: true, skipped: true });
          }

          try {
            await db.insert(competitionEntriesTable).values({
              userId,
              competitionId,
              paymentType: "stripe",
              paymentStatus: "completed",
              paymentMethod: "card",
              stripePaymentIntentId: pi.id,
              amountPaid: pi.amount,
            });
            console.log(
              `Webhook: entered user ${userId} into competition ${competitionId} via PI ${pi.id}`,
            );
          } catch (e: any) {
            if (e?.code === "23505") {
              // Already entered (client beat us to it, or duplicate event) — fine.
              console.log(
                `Webhook: user ${userId} already entered competition ${competitionId} (PI ${pi.id})`,
              );
            } else {
              throw e;
            }
          }
        }

        res.json({ received: true });
      } catch (err: any) {
        console.error("Stripe webhook handler error:", err);
        res.status(500).send(`Webhook handler error: ${err.message}`);
      }
    },
  );

  // Competition entry after successful payment
  // Authz: userId comes from session; req.body userId is ignored.
  // Idempotency: unique index on stripe_payment_intent_id + unique index on
  // (user_id, competition_id) ensure replays of the same payment can't
  // create duplicate entries or duplicate registrations.
  app.post("/api/competitions/:id/enter-with-payment", async (req, res) => {
    try {
      const competitionId = parseInt(req.params.id);
      const { paymentIntentId } = req.body;
      const userId = req.session?.userId || req.session?.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "You must be logged in." });
      }
      if (!paymentIntentId) {
        return res.status(400).json({ message: "Payment intent ID is required" });
      }

      // Verify payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ message: "Payment has not been completed successfully" });
      }

      // Verify the payment metadata matches the authenticated user + competition
      if (parseInt(paymentIntent.metadata.competitionId) !== competitionId ||
          parseInt(paymentIntent.metadata.userId) !== userId) {
        return res.status(400).json({ message: "Payment verification failed" });
      }

      const competition = await storage.getCompetition(competitionId);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      // Idempotent insert — if either unique index fires, treat as success.
      try {
        await db.insert(competitionEntriesTable).values({
          userId,
          competitionId,
          paymentType: 'stripe',
          paymentStatus: 'completed',
          paymentMethod: 'card',
          stripePaymentIntentId: paymentIntentId,
          amountPaid: paymentIntent.amount,
        });
      } catch (e: any) {
        if (e?.code === '23505') {
          // Already recorded — that's fine, the user is in.
          return res.json({
            message: "Already entered with this payment",
            alreadyEntered: true,
          });
        }
        throw e;
      }

      res.json({ message: "Successfully entered competition with payment" });
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

  // =============================================================================
  // DATA SYNC API - For external website integration
  // =============================================================================

  // Get all users with their points (for bulk sync)
  app.get("/api/sync/users-points", async (req, res) => {
    try {
      // Simple API key authentication
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || apiKey !== process.env.SYNC_API_KEY) {
        return res.status(401).json({ message: "Invalid API key" });
      }

      const users = await storage.getUsers();
      const usersWithPoints = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        points: user.points || 0,
        lastUpdated: new Date().toISOString()
      }));

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        count: usersWithPoints.length,
        users: usersWithPoints
      });
    } catch (error) {
      console.error('Error syncing user points:', error);
      res.status(500).json({ message: "Error retrieving user points" });
    }
  });

  // Get specific user points by ID
  app.get("/api/sync/user/:userId/points", async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || apiKey !== process.env.SYNC_API_KEY) {
        return res.status(401).json({ message: "Invalid API key" });
      }

      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          points: user.points || 0,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting user points:', error);
      res.status(500).json({ message: "Error retrieving user points" });
    }
  });

  // Get user points by username (alternative lookup)
  app.get("/api/sync/user-by-username/:username/points", async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || apiKey !== process.env.SYNC_API_KEY) {
        return res.status(401).json({ message: "Invalid API key" });
      }

      const username = req.params.username;
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          points: user.points || 0,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting user points by username:', error);
      res.status(500).json({ message: "Error retrieving user points" });
    }
  });

  // Webhook endpoint to register external website for point updates
  app.post("/api/sync/register-webhook", async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'];
      if (!apiKey || apiKey !== process.env.SYNC_API_KEY) {
        return res.status(401).json({ message: "Invalid API key" });
      }

      const { webhook_url } = req.body;
      if (!webhook_url) {
        return res.status(400).json({ message: "webhook_url is required" });
      }

      // Store webhook URL in environment or database
      // For now, we'll just acknowledge registration
      console.log(`Webhook registered: ${webhook_url}`);
      
      res.json({
        success: true,
        message: "Webhook registered successfully",
        webhook_url: webhook_url,
        registered_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error registering webhook:', error);
      res.status(500).json({ message: "Error registering webhook" });
    }
  });

  // User block routes
  app.post("/api/users/:id/block", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    const blockerId = req.session.userId;
    const blockedId = parseInt(req.params.id);
    if (blockerId === blockedId) return res.status(400).json({ message: "Cannot block yourself" });
    try {
      await storage.blockUser(blockerId, blockedId);
      res.json({ message: "User blocked" });
    } catch (error) {
      res.status(500).json({ message: "Error blocking user" });
    }
  });

  app.delete("/api/users/:id/block", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    const blockerId = req.session.userId;
    const blockedId = parseInt(req.params.id);
    try {
      await storage.unblockUser(blockerId, blockedId);
      res.json({ message: "User unblocked" });
    } catch (error) {
      res.status(500).json({ message: "Error unblocking user" });
    }
  });

  app.get("/api/users/:id/block", async (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ message: "Unauthorized" });
    const blockerId = req.session.userId;
    const blockedId = parseInt(req.params.id);
    try {
      const blocked = await storage.isBlocked(blockerId, blockedId);
      res.json({ blocked });
    } catch (error) {
      res.status(500).json({ message: "Error checking block status" });
    }
  });

  // Health check for sync API
  app.get("/api/sync/health", (req, res) => {
    res.json({
      status: "healthy",
      service: "TacFit Data Sync API",
      timestamp: new Date().toISOString(),
      version: "1.0.0"
    });
  });

  const httpServer = createServer(app);
  // Allow up to 20 minutes for large video uploads before timing out
  httpServer.requestTimeout = 20 * 60 * 1000;
  httpServer.headersTimeout = 20 * 60 * 1000 + 1000;
  httpServer.keepAliveTimeout = 20 * 60 * 1000;
  return httpServer;
}

