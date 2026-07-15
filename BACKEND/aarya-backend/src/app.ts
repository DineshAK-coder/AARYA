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

// Universal CORS configuration (reflects request origin dynamically with credentials support)
app.use(
  cors({
    origin: true,
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

// ── Temporary diagnostic: lists which Google models support embedContent ──────
// Visit /debug/embedding-models to see what's available on this API key.
// REMOVE this route after diagnosing the embedding issue.
app.get('/debug/embedding-models', async (_req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'GEMINI_API_KEY not set' });
    return;
  }
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=200`
    );
    const data = await response.json() as any;
    if (!response.ok) {
      res.status(response.status).json({ googleError: data });
      return;
    }
    const models: any[] = data?.models ?? [];
    const embeddingModels = models
      .filter((m: any) => (m.supportedGenerationMethods ?? []).includes('embedContent'))
      .map((m: any) => ({ name: m.name, displayName: m.displayName }));
    const allModels = models.map((m: any) => ({
      name: m.name,
      methods: m.supportedGenerationMethods,
    }));
    res.json({ embeddingModels, allModels });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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
