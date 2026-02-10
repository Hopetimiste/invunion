/**
 * Invunion API - Core API Service (Cloud Run #1)
 * Point d'entrée principal
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config, validateConfig } from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import v1Routes from './routes/v1/index.js';

// Validate configuration
validateConfig();

const app = express();

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API
}));

// Trust proxy (Cloud Run) - use number for specific proxy count
app.set('trust proxy', 1);

// ============================================
// CORS CONFIGURATION
// ============================================

// Helper to check if origin matches allowed patterns (supports wildcards)
function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  for (const allowed of allowedOrigins) {
    // Exact match
    if (allowed === origin) return true;
    
    // Wildcard match (e.g., https://*.lovableproject.com)
    if (allowed.includes('*')) {
      const pattern = allowed
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars except *
        .replace(/\*/g, '.*'); // Convert * to .*
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(origin)) return true;
    }
  }
  return false;
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, mobile apps, Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // In development, allow all origins
    if (config.nodeEnv === 'development') {
      return callback(null, true);
    }
    
    // If no origins configured, allow all (fallback)
    if (config.cors.allowedOrigins.length === 0) {
      return callback(null, true);
    }
    
    // Check against allowed origins (supports wildcards)
    if (isOriginAllowed(origin, config.cors.allowedOrigins)) {
      return callback(null, true);
    }
    
    // Log rejected origin for debugging
    console.log(`[CORS] Rejected origin: ${origin}`);
    
    // Return false instead of throwing error to avoid 500
    callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400, // 24 hours
}));

// ============================================
// BODY PARSING
// ============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// RATE LIMITING
// ============================================

// General rate limit
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
  // Skip validation for trust proxy since we're using a number (1)
  validate: { trustProxy: false },
});

// Stricter rate limit for admin routes
const adminLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.adminMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many admin requests',
  },
  // Skip validation for trust proxy since we're using a number (1)
  validate: { trustProxy: false },
});

// Apply rate limiters
app.use('/api', generalLimiter);
app.use('/api/v1/admin', adminLimiter);

// ============================================
// LOGGING MIDDLEWARE
// ============================================

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    // Log request (structured for Cloud Logging)
    if (config.nodeEnv === 'production' || duration > 1000) {
      console.log(JSON.stringify({
        type: 'REQUEST',
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      }));
    }
  });
  
  next();
});

// ============================================
// ROUTES
// ============================================

// API v1 routes
app.use('/api/v1', v1Routes);

// Legacy routes (redirect to v1)
app.use('/api', (req, res, next) => {
  // Only redirect if not already going to v1
  if (!req.path.startsWith('/v1')) {
    // For backwards compatibility, forward to v1
    req.url = `/v1${req.url}`;
  }
  next();
}, v1Routes);

// Root redirect
app.get('/', (req, res) => {
  res.json({
    service: 'Invunion API',
    version: '2.0.0',
    documentation: '/api/v1/health',
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================
// SERVER START
// ============================================

const server = app.listen(config.port, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                  INVUNION API - CORE                       ║
╠════════════════════════════════════════════════════════════╣
║  Version:     2.0.0                                        ║
║  Port:        ${config.port.toString().padEnd(44)}║
║  Environment: ${config.nodeEnv.padEnd(44)}║
║  Firebase:    ${config.firebase.projectId.padEnd(44)}║
╚════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('[Server] Server closed');
    process.exit(0);
  });
});

export default app;
