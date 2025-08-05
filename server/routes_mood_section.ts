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

  const httpServer = createServer(app);
  return httpServer;
}
