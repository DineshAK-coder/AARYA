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

// CORS configuration for local development, production frontend, and preview deployments
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin === 'http://localhost:3000' ||
        origin === 'https://aarya-frontend.vercel.app' ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
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
