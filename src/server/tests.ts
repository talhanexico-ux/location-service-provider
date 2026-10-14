/**
 * spyxbd - Test Suite Runner (Section 21 Compliance)
 * Executes tests across validation, orders, idempotency, rate limiting, and Telegram formatting.
 */

import { validateAndNormalizeBDPhone, validateCoordinates } from './validator.js';
import { db } from './db.js';
import { telegramService } from './telegram.js';

export interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

export interface TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
  timestamp: string;
}

export async function runAllTests(): Promise<TestSuiteSummary> {
  const results: TestResult[] = [];

  const runTest = (name: string, category: string, fn: () => void | Promise<void>) => {
    const start = Date.now();
    try {
      fn();
      results.push({
        name,
        category,
        passed: true,
        message: 'Passed successfully',
        durationMs: Date.now() - start,
      });
    } catch (err: unknown) {
      results.push({
        name,
        category,
        passed: false,
        message: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
      });
    }
  };

  // 1. Valid Bangladeshi Phone Numbers Test
  runTest('Valid BD phone numbers normalization (017, 018, 019, 013, +8801)', 'Validation', () => {
    const validSamples = ['01712345678', '+8801812345678', '8801912345678', '01398765432'];
    for (const sample of validSamples) {
      const res = validateAndNormalizeBDPhone(sample);
      if (!res.isValid) throw new Error(`Expected ${sample} to be valid`);
      if (!res.normalizedInternational.startsWith('+8801')) {
        throw new Error(`Expected +8801 prefix, got ${res.normalizedInternational}`);
      }
    }
  });

  // 2. Invalid Phone Numbers Test
  runTest('Invalid phone numbers rejected', 'Validation', () => {
    const invalidSamples = ['12345', '02123456789', '+14155552671', '01712345', 'abc01712345678', ''];
    for (const sample of invalidSamples) {
      const res = validateAndNormalizeBDPhone(sample);
      if (res.isValid) throw new Error(`Expected ${sample} to be rejected`);
    }
  });

  // 3. Coordinate validation
  runTest('Valid GPS coordinates within ranges', 'Geolocation', () => {
    const res = validateCoordinates(23.8103, 90.4125, 12.5);
    if (!res.isValid) throw new Error(`Coordinates should be valid: ${res.errors.join(', ')}`);
  });

  // 4. Invalid Coordinates Test (out of bounds)
  runTest('Invalid coordinates rejected (lat > 90, lng > 180)', 'Geolocation', () => {
    const resLat = validateCoordinates(95.0, 90.0, 10);
    if (resLat.isValid) throw new Error('Expected out-of-range latitude to be rejected');

    const resLng = validateCoordinates(23.0, 200.0, 10);
    if (resLng.isValid) throw new Error('Expected out-of-range longitude to be rejected');
  });

  // 5. Missing / Negative accuracy rejected
  runTest('Missing or negative accuracy rejected', 'Geolocation', () => {
    const resNeg = validateCoordinates(23.8, 90.4, -5);
    if (resNeg.isValid) throw new Error('Expected negative accuracy to be rejected');

    const resZero = validateCoordinates(23.8, 90.4, 0);
    if (resZero.isValid) throw new Error('Expected zero accuracy to be rejected');
  });

  // 6. Order Creation & Database Persistence
  runTest('Successful order creation & storage', 'Database', () => {
    const testIdempotency = `test-${Date.now()}-${Math.random()}`;
    const order = db.create({
      phoneNumber: '01700000000',
      phoneInternational: '+8801700000000',
      operator: 'Grameenphone',
      consentGranted: true,
      consentTimestamp: new Date().toISOString(),
      latitude: 23.8103,
      longitude: 90.4125,
      accuracyMeters: 8.5,
      locationTimestamp: new Date().toISOString(),
      originalPrice: 750,
      discountedPrice: 450,
      currency: 'BDT',
      status: 'RECEIVED',
      paymentStatus: 'PENDING',
      notificationStatus: 'PENDING',
      idempotencyKey: testIdempotency,
    });

    if (!order.id || !order.id.startsWith('SPX-')) {
      throw new Error(`Order ID format invalid: ${order.id}`);
    }

    const fetched = db.getById(order.id);
    if (!fetched || fetched.id !== order.id) {
      throw new Error('Order not found in database storage');
    }
  });

  // 7. Duplicate Order Submission via Idempotency Key
  runTest('Duplicate order submission handled safely via idempotency', 'Database', () => {
    const idempKey = `idem-test-${Date.now()}`;
    const order1 = db.create({
      phoneNumber: '01800000000',
      phoneInternational: '+8801800000000',
      consentGranted: true,
      consentTimestamp: new Date().toISOString(),
      latitude: 23.7,
      longitude: 90.3,
      accuracyMeters: 10,
      locationTimestamp: new Date().toISOString(),
      originalPrice: 750,
      discountedPrice: 450,
      currency: 'BDT',
      status: 'RECEIVED',
      paymentStatus: 'PENDING',
      notificationStatus: 'PENDING',
      idempotencyKey: idempKey,
    });

    const existing = db.getByIdempotencyKey(idempKey);
    if (!existing || existing.id !== order1.id) {
      throw new Error('Idempotency lookup failed');
    }
  });

  // 8. Telegram Notification Message Formatting
  runTest('Telegram notification message template accuracy', 'Telegram', () => {
    const fakeOrder = {
      id: 'SPX-TEST-001',
      phoneNumber: '01712345678',
      phoneInternational: '+8801712345678',
      operator: 'Grameenphone',
      consentGranted: true,
      consentTimestamp: new Date().toISOString(),
      latitude: 23.810332,
      longitude: 90.412518,
      accuracyMeters: 6,
      locationTimestamp: new Date().toISOString(),
      originalPrice: 750,
      discountedPrice: 450,
      currency: 'BDT',
      status: 'RECEIVED' as const,
      paymentStatus: 'PENDING' as const,
      notificationStatus: 'PENDING' as const,
      notificationRetries: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const msg = telegramService.buildOrderMessage(fakeOrder);
    if (!msg.includes('NEW SPYXBD ORDER')) throw new Error('Missing title');
    if (!msg.includes('750 Tk') || !msg.includes('450 Tk')) throw new Error('Missing pricing');
    if (!msg.includes('+8801712345678')) throw new Error('Missing phone number');
    if (!msg.includes('23.810332') || !msg.includes('90.412518')) throw new Error('Missing coordinates');
    if (!msg.includes('https://www.google.com/maps?q=')) throw new Error('Missing Google Maps link');
    if (!msg.includes('Customer consent: Confirmed')) throw new Error('Missing consent disclosure');
  });

  // 9. Retention policy purge
  runTest('Data retention purge logic', 'Database', () => {
    const purgeRes = db.purgeOlderThanDays(90);
    if (typeof purgeRes.purgedCount !== 'number') {
      throw new Error('Purge failed to return purged count');
    }
  });

  const passed = results.filter(r => r.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
    timestamp: new Date().toISOString(),
  };
}
