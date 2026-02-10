// src/index.js

import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import admin from "firebase-admin";
import { Logging } from "@google-cloud/logging";

// --- NOUVEL AJOUT : Import de tes routes d'onboarding ---
import onboardingRoutes from './routes/onboarding.js';
// --------------------------------------------------------

const logging = new Logging();
const app = express();

/**
 * Global middleware
 */
app.use(express.json());

/**
 * CORS strict
 */
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Si aucune origine spécifiée (ex: requêtes Postman, curl), autoriser
      if (!origin) {
        return callback(null, true);
      }

      // Si allowedOrigins est vide (dev), autoriser toutes les origines
      if (allowedOrigins.length === 0) {
        return callback(null, true);
      }

      // Vérifier si l'origine est dans la liste autorisée
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Origine non autorisée
      callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // Permet l'envoi de cookies/credentials si nécessaire
  })
);

/**
 * Firebase Admin init
 */
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

/**
 * Auth middleware
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const match = header.match(/^Bearer (.+)$/);
    if (!match) return res.status(401).json({ error: "Missing Bearer token" });

    const decoded = await admin.auth().verifyIdToken(match[1]);

    req.user = {
      uid: decoded.uid,
      email: decoded.email || null,
      claims: decoded, 
    };

    return next();
  } catch (err) {
    return res.status(401).json({
      error: "Invalid token",
      details: String(err?.message || err),
    });
  }
}

/**
 * Admin auth via Firebase custom claims (admin: true)
 */
function requireAdmin(req, res, next) {
  // 1. On vérifie le claim standard "admin: true"
  const isBooleanAdmin = req.user?.claims?.admin === true;
  
  // 2. On vérifie LE NOTRE : "role: 'admin'"
  const isRoleAdmin = req.user?.claims?.role === 'admin';

  // Si aucun des deux n'est bon, on rejette
  if (!isBooleanAdmin && !isRoleAdmin) {
    console.log(`Access denied for user ${req.user.email}. Claims:`, req.user.claims); // Log utile pour debugger
    return res.status(403).json({ error: "Forbidden: admin only" });
  }

  return next();
}

/**
 * Rate limiting for /admin/*
 */
const adminLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 60, 
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/admin", adminLimiter);

// --- NOUVEL AJOUT : Branchement de la route Onboarding ---
// Cela rend accessible : POST /api/signup-tenant
app.use("/api", onboardingRoutes);
// ---------------------------------------------------------

/**
 * Public routes
 */
app.get("/health", (req, res) => res.json({ ok: true }));

app.get("/me", requireAuth, (req, res) => {
  res.json({ uid: req.user.uid, email: req.user.email });
});

/**
 * Admin routes (protected)
 */
app.get("/admin/summary", requireAuth, requireAdmin, (req, res) => {
  res.json({
    total_tenants: 0,
    active_tenants: 0,
    connected_connections: 0,
    sync_failures_last_24h: 0,
  });
});

app.get("/admin/tenants", requireAuth, requireAdmin, (req, res) => {
  res.json({ items: [] });
});

app.post("/admin/logs/test", requireAuth, requireAdmin, (req, res) => {
  console.log(
    JSON.stringify({
      type: "ADMIN_LOG_TEST",
      ts: new Date().toISOString(),
      from: req.user.email,
      message: req.body?.message || "hello from test endpoint",
    })
  );
  res.json({ ok: true });
});

app.get("/admin/logs", requireAuth, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);
    const pageToken = req.query.pageToken || undefined;
    const severity = req.query.severity || undefined;
    const q = (req.query.q || "").toString().trim();
    const from = req.query.from ? new Date(req.query.from.toString()) : null;
    const to = req.query.to ? new Date(req.query.to.toString()) : null;

    let filter = `
resource.type="cloud_run_revision"
resource.labels.service_name="invunion-api"
`.trim();

    if (severity) filter += `\nseverity>=${severity}`;
    if (from && !isNaN(from)) filter += `\ntimestamp>="${from.toISOString()}"`;
    if (to && !isNaN(to)) filter += `\ntimestamp<="${to.toISOString()}"`;
    if (q) filter += `\n"${q.replace(/"/g, '\\"')}"`;

    const [entries, , apiResponse] = await logging.getEntries({
      filter,
      orderBy: "timestamp desc",
      pageSize: limit,
      pageToken,
    });

    const logs = entries.map((e) => {
      const md = e.metadata || {};
      const payload =
        typeof e.data === "string"
          ? e.data
          : e.data?.message || e.data?.msg
          ? e.data.message || e.data.msg
          : JSON.stringify(e.data);

      return {
        timestamp: md.timestamp || null,
        level: md.severity || "DEFAULT",
        source: "cloud_run",
        tenant_id: null,
        message: payload || null,
        trace: md.trace || null,
        insertId: md.insertId || null,
      };
    });

    res.json({
      logs,
      nextPageToken: apiResponse?.nextPageToken || null,
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to fetch logs",
      details: String(err?.message || err),
    });
  }
});

/**
 * Start server
 */
const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`API listening on :${port}`));