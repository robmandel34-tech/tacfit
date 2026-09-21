import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seed-data";
import { startDigestScheduler } from "./digest-service";
import { ObjectStorageService } from "./objectStorage";
import { notifyIssue } from "./slack-service";
import path from "path";
import fs from "fs";

const app = express();
// Stripe webhook needs the raw request body to verify the signature,
// so skip JSON parsing for that path and let the route handler use express.raw().
app.use((req, res, next) => {
  if (req.originalUrl === '/api/stripe-webhook') return next();
  express.json()(req, res, next);
});
app.use(express.urlencoded({ extended: false }));

// CORS — restrict to same origin; allow webhooks from known external services
app.use((req, res, next) => {
  const allowedOrigins = [
    process.env.APP_ORIGIN,
    'capacitor://localhost',
    'ionic://localhost',
    'http://localhost',
    // Muster Up custom domain (additive — current Replit URL still works).
    // Final domain: joinmuster.com (purchased 2026-06-16). www + app covered.
    'https://joinmuster.com',
    'https://www.joinmuster.com',
    'https://app.joinmuster.com',
  ].filter(Boolean);
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Same-origin or server-to-server request — allow through
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  // The native app is a cross-origin WKWebView (capacitor://localhost), so every
  // API call is preflighted and EVERY request header must be allowed here. The
  // HeyCatch/PostHog tracing extension stamps X-POSTHOG-SESSION-ID,
  // X-POSTHOG-WINDOW-ID and X-POSTHOG-DISTINCT-ID on calls to the API host
  // (it loads lazily, so the first launch requests slip through and everything
  // after fails). Allowing only one of them blanked the whole iOS app: no
  // content, no login. Echo whatever the preflight asks for — the origin
  // allow-list above is the real access control — so a future SDK header can't
  // brick the native app again; keep the static list for non-preflight replies.
  const requestedHeaders = req.headers['access-control-request-headers'];
  res.header(
    'Access-Control-Allow-Headers',
    requestedHeaders ||
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-POSTHOG-SESSION-ID, X-POSTHOG-WINDOW-ID, X-POSTHOG-DISTINCT-ID',
  );
  res.header('Access-Control-Allow-Credentials', 'true');
  // Responses vary per origin / requested headers; keep caches from reusing one
  // origin's CORS answer for another.
  res.header('Vary', 'Origin, Access-Control-Request-Headers');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// HeyCatch short links: single-character paths (/a … /z, /0 … /9) are reserved
// for channel attribution. Each one lands on the app with the campaign in the
// query string, where the HeyCatch SDK reads it. Registered before every other
// route so neither the API nor the SPA catch-all can shadow it.
app.get(/^\/([a-z0-9])$/, (req, res) => {
  res.redirect(302, `/?utm_source=heycatch&utm_campaign=${req.params[0]}`);
});

// Serve uploaded media — object storage first, local disk as fallback (dev)
app.use('/uploads', async (req, res, next) => {
  const fileName = req.path.replace(/^\//, '');
  if (!fileName) return next();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  // Try object storage first (used in production)
  if (process.env.PRIVATE_OBJECT_DIR) {
    try {
      const svc = new ObjectStorageService();
      const file = await svc.getUploadedFile(fileName);
      if (file) {
        return svc.downloadObject(file, res, 86400);
      }
    } catch (_) {}
  }

  // Fallback: serve from local uploads/ directory (dev only)
  next();
}, express.static('uploads'));

// --- Marketing landing page preview (dev only) ---
// Serves the standalone Netlify marketing site through the dev server so it can
// be viewed in the workspace. Assets are isolated under /__mktg to avoid any
// collision with the React app. Absolute asset paths inside the marketing HTML
// (/marketing/*, /favicons/*) are rewritten to that prefix on the fly.
const marketingDir = path.resolve(import.meta.dirname, "..", "marketing-site");
app.use("/__mktg", express.static(marketingDir));
app.get("/landing-preview", (_req, res) => {
  try {
    let html = fs.readFileSync(path.join(marketingDir, "index.html"), "utf8");
    html = html
      .replace(/="\/marketing\//g, '="/__mktg/marketing/')
      .replace(/="\/favicons\//g, '="/__mktg/favicons/');
    res.type("html").send(html);
  } catch (err) {
    res.status(500).send("Marketing preview unavailable");
  }
});

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

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Report real server errors (5xx) to the Slack issues channel — throttled
    // so a burst of the same error won't flood it. Client errors (4xx) are skipped.
    if (status >= 500) {
      notifyIssue(`🛑 *App error* — ${req.method} ${req.path} → ${status}: ${message}`);
    }

    if (!res.headersSent) {
      res.status(status).json({ message });
    }
    console.error("Unhandled request error:", err);
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

    // Start the per-competition Slack digest scheduler
    startDigestScheduler();
  });

  // Graceful shutdown: without this, a restart can leave the old process
  // alive holding port 5000, and the new one crashes with EADDRINUSE.
  const shutdown = (signal: string) => {
    log(`received ${signal}, shutting down`);
    server.close(() => process.exit(0));
    // Force-exit if connections keep the server from closing in time
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})();
