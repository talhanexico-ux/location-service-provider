/**
 * spyxbd - Server Entry Point
 * Express server running on port 3000 with Vite middleware in dev mode.
 */

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createHash, timingSafeEqual } from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { validateAndNormalizeBDPhone, validateCoordinates } from './src/server/validator.js';
import { db } from './src/server/db.js';
import { telegramService } from './src/server/telegram.js';
import { runAllTests } from './src/server/tests.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Basic in-memory rate limiter per IP
const requestCounts = new Map<string, { count: number; resetTime: number }>();
function rateLimiter(limit = 60, windowMs = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = requestCounts.get(ip);

    if (!entry || now > entry.resetTime) {
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (entry.count >= limit) {
      return res.status(429).json({
        error: 'Too many requests. Please wait a minute before retrying.',
      });
    }

    entry.count++;
    next();
  };
}

function matchesSecret(expected: string, provided: string | undefined): boolean {
  if (!provided) return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

function isAdminApiAuthorized(req: Request): boolean {
  const secret = process.env.ADMIN_API_SECRET;
  return Boolean(secret && matchesSecret(secret, req.header('x-admin-secret')));
}

// Security & Body parsing
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Custom basic security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Periodic background worker for Telegram retry (every 30 seconds)
setInterval(() => {
  telegramService.processRetryQueue().catch(err => {
    console.error('[Worker] Retry queue error:', err);
  });
}, 30000);

// API Routes

// 1. Order Creation
app.post('/api/orders', rateLimiter(20, 60000), async (req: Request, res: Response) => {
  try {
    const {
      phoneNumber,
      consent,
      latitude,
      longitude,
      accuracy,
      locationTimestamp,
      altitude,
      heading,
      speed,
      idempotencyKey,
      customerAccessToken,
    } = req.body;

    // 1. Explicit consent verification
    if (consent !== true) {
      return res.status(400).json({
        success: false,
        error: 'Customer consent is required to share device location.',
      });
    }

    if (typeof customerAccessToken !== 'string' || customerAccessToken.length < 32) {
      return res.status(400).json({ success: false, error: 'A secure customer access token is required.' });
    }

    // 2. Validate Bangladeshi phone number
    const phoneValidation = validateAndNormalizeBDPhone(phoneNumber);
    if (!phoneValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: phoneValidation.error || 'Invalid Bangladeshi phone number.',
      });
    }

    // 3. Validate coordinates & accuracy
    const coordValidation = validateCoordinates(latitude, longitude, accuracy);
    if (!coordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: coordValidation.errors.join('. '),
      });
    }

    // 4. Validate location timestamp
    const locDate = locationTimestamp ? new Date(locationTimestamp) : new Date();
    if (isNaN(locDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid location timestamp format.',
      });
    }

    // Reject future timestamps (> 15 minutes ahead)
    if (locDate.getTime() > Date.now() + 15 * 60 * 1000) {
      return res.status(400).json({
        success: false,
        error: 'Location timestamp cannot be in the future.',
      });
    }

    // 5. Check Idempotency Key
    if (idempotencyKey && typeof idempotencyKey === 'string') {
      const existing = db.getByIdempotencyKey(idempotencyKey);
      if (existing) {
        const tokenHash = createHash('sha256').update(customerAccessToken).digest('hex');
        if (existing.customerTokenHash !== tokenHash) {
          return res.status(409).json({ success: false, error: 'This order submission key is already in use.' });
        }
        return res.status(200).json({
          success: true,
          orderId: existing.id,
          status: existing.status,
          notificationStatus: existing.notificationStatus,
          message: 'Order retrieved successfully (idempotent submission).',
        });
      }
    }

    // 6. Create order in Database (Server enforces prices: 750 Tk original, 450 Tk discounted)
    const order = db.create({
      phoneNumber: phoneValidation.normalizedLocal,
      phoneInternational: phoneValidation.normalizedInternational,
      operator: phoneValidation.operator,
      consentGranted: true,
      consentTimestamp: new Date().toISOString(),
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracyMeters: Number(accuracy),
      locationTimestamp: locDate.toISOString(),
      altitude: typeof altitude === 'number' ? altitude : null,
      heading: typeof heading === 'number' ? heading : null,
      speed: typeof speed === 'number' ? speed : null,
      originalPrice: 750,
      discountedPrice: 450,
      currency: 'BDT',
      status: 'RECEIVED',
      paymentStatus: 'PENDING',
      notificationStatus: 'PENDING',
      idempotencyKey: idempotencyKey || null,
      customerTokenHash: createHash('sha256').update(customerAccessToken).digest('hex'),
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
    });

    // 7. Attempt Telegram notification dispatch immediately
    const telegramResult = await telegramService.sendOrderNotification(order);

    // Refresh order state from DB
    const refreshedOrder = db.getById(order.id) || order;

    return res.status(201).json({
      success: true,
      orderId: refreshedOrder.id,
      status: refreshedOrder.status,
      notificationStatus: refreshedOrder.notificationStatus,
      message: refreshedOrder.notificationStatus === 'SENT'
        ? 'Your order has been submitted successfully and delivered to the administrator!'
        : 'Your order has been received successfully! Administrator notification is queued.',
      telegramDelivered: refreshedOrder.notificationStatus === 'SENT',
    });
  } catch (err: unknown) {
    console.error('[API] Order creation error:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected internal error occurred while processing your order.',
    });
  }
});

// Customer status and location access; precise coordinates are returned only after admin approval.
app.get('/api/orders/:id/status', rateLimiter(60, 60000), (req: Request, res: Response) => {
  const order = db.getById(req.params.id);
  const accessToken = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!order || !accessToken || !order.customerTokenHash) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const accessTokenHash = createHash('sha256').update(accessToken).digest('hex');
  if (!matchesSecret(order.customerTokenHash, accessTokenHash)) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const isApproved = order.status === 'CONFIRMED' && order.paymentStatus === 'PAID';
  return res.json({
    orderId: order.id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    ...(isApproved ? {
      location: {
        latitude: order.latitude,
        longitude: order.longitude,
        accuracy: order.accuracyMeters,
        timestamp: order.locationTimestamp,
      },
    } : {}),
  });
});

// Telegram bot approval callbacks, authenticated with Telegram's webhook secret.
app.post('/api/telegram/webhook', async (req: Request, res: Response) => {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const adminIds = (process.env.TELEGRAM_ADMIN_USER_IDS || '')
    .split(',')
    .map(id => Number(id.trim()))
    .filter(Number.isSafeInteger);

  if (!webhookSecret || !matchesSecret(webhookSecret, req.header('x-telegram-bot-api-secret-token'))) {
    return res.status(403).json({ error: 'Forbidden.' });
  }
  if (adminIds.length === 0) return res.status(503).json({ error: 'Telegram admin IDs are not configured.' });

  const result = await telegramService.handleCallbackUpdate(req.body, adminIds);
  return res.status(result.success || result.error === 'Order not found or invalid action.' ? 200 : 403)
    .json({ ok: result.success, error: result.error });
});

// 2. Order Lookup (for customers & admin)
app.get('/api/orders/lookup', rateLimiter(30, 60000), (req: Request, res: Response) => {
  const query = (req.query.query as string) || '';
  if (!query.trim()) {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const results = db.search(query);
  return res.json({
    count: results.length,
    results: results.map(order => ({
      id: order.id,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
    })),
  });
});

// 3. Admin: List all orders
app.get('/api/orders', rateLimiter(60, 60000), (_req: Request, res: Response) => {
  if (!isAdminApiAuthorized(_req)) return res.status(404).end();
  const orders = db.list(100);
  const stats = db.getStats();
  const telegramConfig = telegramService.getConfig();
  const telegramOnline = telegramService.isConfigured();

  return res.json({
    stats,
    telegramConfig,
    telegramOnline,
    orders,
  });
});

// 4. Admin: Retry Telegram notification
app.post('/api/orders/:id/retry-telegram', async (req: Request, res: Response) => {
  if (!isAdminApiAuthorized(req)) return res.status(404).end();
  const { id } = req.params;
  const order = db.getById(id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const result = await telegramService.sendOrderNotification(order);
  const updated = db.getById(id);
  return res.json({
    success: result.success,
    result,
    order: updated,
  });
});

// 5. Customer / Admin: Right to erasure / delete order
app.delete('/api/orders/:id', (req: Request, res: Response) => {
  if (!isAdminApiAuthorized(req)) return res.status(404).end();
  const { id } = req.params;
  const deleted = db.delete(id);
  if (!deleted) {
    return res.status(404).json({ error: 'Order not found' });
  }
  return res.json({ success: true, message: 'Order and associated location data deleted successfully.' });
});

// 6. Admin: Purge data retention
app.post('/api/admin/purge-retention', (req: Request, res: Response) => {
  if (!isAdminApiAuthorized(req)) return res.status(404).end();
  const days = req.body.days ? parseInt(req.body.days, 10) : 30;
  const result = db.purgeOlderThanDays(days);
  return res.json({
    success: true,
    message: `Purged records older than ${days} days`,
    ...result,
  });
});

// 7. Admin: Diagnostic Telegram Test
app.post('/api/admin/test-telegram', async (_req: Request, res: Response) => {
  if (!isAdminApiAuthorized(_req)) return res.status(404).end();
  const result = await telegramService.sendTestMessage();
  return res.json(result);
});

// 8. Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    telegramConfigured: telegramService.isConfigured(),
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '8220144989',
    database: 'active',
  });
});

// 9. Automated Test Runner Endpoint (Section 21)
app.get('/api/test-suite', async (_req: Request, res: Response) => {
  try {
    const summary = await runAllTests();
    res.json(summary);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  void telegramService.configureWebhook();
  if (!isProduction) {
    // Mount Vite middleware in development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SPYXBD] Server running on http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch(err => {
  console.error('[SPYXBD] Failed to launch server:', err);
});
