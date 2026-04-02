import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seed-data";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS — restrict to same origin; allow webhooks from known external services
app.use((req, res, next) => {
  const allowedOrigins = [
    process.env.APP_ORIGIN,
    'https://hooks.stripe.com',
  ].filter(Boolean);
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Same-origin or server-to-server request — allow through
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Enhanced static file serving for both images and videos
app.use('/uploads', (req, res, next) => {
  const filePath = path.join(process.cwd(), 'uploads', req.path);
  const ext = path.extname(req.path).toLowerCase();
  
  // Set proper headers for all media files
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  
  // Handle video files
  if (['.mov', '.mp4', '.webm', '.avi'].includes(ext)) {
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Set proper MIME types for videos
    switch (ext) {
      case '.mov':
        res.setHeader('Content-Type', 'video/quicktime');
        break;
      case '.mp4':
        res.setHeader('Content-Type', 'video/mp4');
        break;
      case '.webm':
        res.setHeader('Content-Type', 'video/webm');
        break;
      case '.avi':
        res.setHeader('Content-Type', 'video/x-msvideo');
        break;
    }
  }
  
  // Handle image files
  if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day cache for images
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Set proper MIME types for images
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        res.setHeader('Content-Type', 'image/jpeg');
        break;
      case '.png':
        res.setHeader('Content-Type', 'image/png');
        break;
      case '.gif':
        res.setHeader('Content-Type', 'image/gif');
        break;
      case '.webp':
        res.setHeader('Content-Type', 'image/webp');
        break;
      case '.svg':
        res.setHeader('Content-Type', 'image/svg+xml');
        break;
    }
  }
  
  next();
}, express.static('uploads', {
  // Additional static file options for better media serving
  setHeaders: (res, path, stat) => {
    const ext = path.split('.').pop()?.toLowerCase();
    if (['mp4', 'webm', 'mov', 'avi'].includes(ext || '')) {
      res.setHeader('Accept-Ranges', 'bytes');
    }
    // Set ETag for better caching
    res.setHeader('ETag', `"${stat.size}-${stat.mtime.getTime()}"`);
  }
}));


app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, async () => {
    log(`serving on port ${port}`);
    
    // Seed the database with initial data
    await seedDatabase();
  });
})();
