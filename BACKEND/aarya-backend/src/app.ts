import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

import authRoutes        from './modules/auth/auth.routes.js';
import companiesRoutes   from './modules/companies/companies.routes.js';
import transactionRoutes from './modules/transactions/transactions.routes.js';
import snapshotRoutes    from './modules/snapshots/snapshots.routes.js';
import decisionRoutes    from './modules/decisions/decisions.routes.js';
import chatRoutes        from './modules/chat/chat.routes.js';
import { errorMiddleware } from './middleware/error.middleware.js';

dotenv.config();

const app = express();

// ============================================================
// Security & Logging Middleware
// ============================================================

// Helmet sets secure HTTP headers
app.use(helmet());

// CORS – tighten origins in production
// CORS_ORIGIN env var may be a single origin or comma-separated list
const rawOrigins = process.env.CORS_ORIGIN ?? '*';
const allowedOrigins: string | string[] | RegExp =
  rawOrigins === '*'
    ? '*'
    : rawOrigins.split(',').map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins === '*') return callback(null, true);
      if ((allowedOrigins as string[]).includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// HTTP request logging (combined in production, dev in development)
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// JSON body parser (for non-multipart routes)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// Health Check (no auth required)
// ============================================================

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'aarya-backend',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// API Routes
// ============================================================

app.use('/api/auth',        authRoutes);
app.use('/api/companies',   companiesRoutes);

// Transaction routes export their own full paths (/upload-transactions, /transactions)
app.use('/api',             transactionRoutes);

app.use('/api/snapshots',   snapshotRoutes);
app.use('/api/decisions',   decisionRoutes);
app.use('/api/chat',        chatRoutes);

// ============================================================
// 404 handler – catches unmatched routes
// ============================================================

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found.',
    code: 'NOT_FOUND',
  });
});

// ============================================================
// Global error handler (must be last)
// ============================================================

app.use(errorMiddleware);

export default app;
