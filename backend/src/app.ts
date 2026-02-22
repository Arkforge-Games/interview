import express, { Application } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import { corsMiddleware } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import routes from './routes';
import { env } from './config/environment';

export function createApp(): Application {
  const app = express();

  // Security middleware — CSP must allow all CDN scripts used by the frontend
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com", "https://aistudiocdn.com", "https://accounts.google.com", "https://apis.google.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://accounts.google.com", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https://accounts.google.com", "https://generativelanguage.googleapis.com", "https://checkout.stripe.com", "https://api.stripe.com"],
        frameSrc: ["'self'", "https://accounts.google.com", "https://checkout.stripe.com", "https://js.stripe.com"],
        mediaSrc: ["'self'", "blob:"],
        workerSrc: ["'self'", "blob:", "https://cdnjs.cloudflare.com"],
      },
    },
  }));

  // CORS
  app.use(corsMiddleware);

  // Request logging
  if (env.isDevelopment) {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // Raw body parser for Stripe webhooks (must come BEFORE express.json)
  app.use('/api/v1/stripe/webhook', express.raw({ type: 'application/json' }));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API routes
  app.use('/api/v1', routes);

  // Serve static frontend in production
  if (env.isProduction) {
    const publicPath = path.resolve(__dirname, '../public');
    app.use(express.static(publicPath));

    // SPA fallback - serve index.html for non-API routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(publicPath, 'index.html'));
    });
  } else {
    // Root endpoint for development
    app.get('/', (req, res) => {
      res.json({
        name: 'SlayJobs API',
        version: '1.0.0',
        status: 'running',
        docs: '/api/v1/health',
      });
    });

    // 404 handler (dev only - production uses SPA fallback)
    app.use(notFoundHandler);
  }

  // Error handler
  app.use(errorHandler);

  return app;
}
