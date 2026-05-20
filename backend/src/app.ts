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
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com", "https://aistudiocdn.com", "https://accounts.google.com", "https://apis.google.com", "https://www.googletagmanager.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://accounts.google.com", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https://slayjobs.com", "https://www.slayjobs.com", "https://hobbyland-interview.azurewebsites.net", "https://slayjobs-production.up.railway.app", "https://accounts.google.com", "https://generativelanguage.googleapis.com", "https://checkout.stripe.com", "https://api.stripe.com", "https://www.google-analytics.com", "https://*.analytics.google.com", "https://www.googletagmanager.com"],
        frameSrc: ["'self'", "https://accounts.google.com", "https://checkout.stripe.com", "https://js.stripe.com"],
        mediaSrc: ["'self'", "blob:"],
        workerSrc: ["'self'", "blob:", "https://cdnjs.cloudflare.com"],
      },
    },
  }));

  // CORS — scoped to /api only so static assets never trip the allow-list check
  // (browser sends Origin header on asset requests when loaded as part of a page;
  //  a global app.use(corsMiddleware) returns 500 for assets on any new domain)
  app.use('/api', corsMiddleware);

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

  // SEO: robots.txt and sitemap.xml — must come before the SPA catch-all
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send(
`User-agent: *
Allow: /
Disallow: /api/
Disallow: /auth/

User-agent: facebookexternalhit
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: LinkedInBot
Allow: /

Sitemap: https://slayjobs.com/sitemap.xml
`
    );
  });
  app.get(['/sitemap.xml', '/sitemap_index.xml'], (_req, res) => {
    const base = 'https://slayjobs.com';
    const lastmod = new Date().toISOString().slice(0, 10);
    const urls = [
      { loc: '/',             changefreq: 'weekly',  priority: '1.0' },
      { loc: '/subscription', changefreq: 'monthly', priority: '0.8' },
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${base}${u.loc}</loc><lastmod>${lastmod}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`;
    res.type('application/xml').send(xml);
  });

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
