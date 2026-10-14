/**
 * spyxbd - Database Persistence Layer
 * Implements persistent order storage, idempotency, retention, and search.
 */

import fs from 'fs';
import path from 'path';

export type OrderStatus = 'RECEIVED' | 'PROCESSING' | 'CONFIRMED' | 'CANCELLED';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'RETRYING';
export type PaymentStatus = 'PENDING' | 'PAID';

export interface OrderRecord {
  id: string;
  phoneNumber: string;
  phoneInternational: string;
  operator?: string;
  consentGranted: boolean;
  consentTimestamp: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  locationTimestamp: string;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  originalPrice: number;
  discountedPrice: number;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  notificationStatus: NotificationStatus;
  notificationError?: string | null;
  notificationRetries: number;
  telegramMessageId?: string | null;
  customerTokenHash?: string | null;
  idempotencyKey?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'orders.json');

class DatabaseStore {
  private orders: Map<string, OrderRecord> = new Map();
  private idempotencyIndex: Map<string, string> = new Map(); // key -> orderId
  private isLoaded = false;

  constructor() {
    this.ensureStorage();
  }

  private ensureStorage() {
    if (this.isLoaded) return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed: OrderRecord[] = JSON.parse(raw);
        this.orders.clear();
        this.idempotencyIndex.clear();
        for (const order of parsed) {
          this.orders.set(order.id, { ...order, paymentStatus: order.paymentStatus || 'PENDING' });
          if (order.idempotencyKey) {
            this.idempotencyIndex.set(order.idempotencyKey, order.id);
          }
        }
      } else {
        this.saveToFile();
      }
      this.isLoaded = true;
    } catch (err) {
      console.error('[DB] Failed to load orders from disk:', err);
      this.isLoaded = true;
    }
  }

  private saveToFile() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const data = Array.from(this.orders.values());
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('[DB] Failed to write orders to disk:', err);
    }
  }

  public getById(id: string): OrderRecord | undefined {
    this.ensureStorage();
    return this.orders.get(id);
  }

  public getByIdempotencyKey(key: string): OrderRecord | undefined {
    this.ensureStorage();
    const orderId = this.idempotencyIndex.get(key);
    if (!orderId) return undefined;
    return this.orders.get(orderId);
  }

  public create(orderData: Omit<OrderRecord, 'id' | 'createdAt' | 'updatedAt' | 'notificationRetries'>): OrderRecord {
    this.ensureStorage();

    // Generate unique order ID: SPX-YYMMDD-XXXX
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    const id = `SPX-${dateStr}-${rand}`;

    const newOrder: OrderRecord = {
      ...orderData,
      id,
      notificationRetries: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.orders.set(id, newOrder);
    if (newOrder.idempotencyKey) {
      this.idempotencyIndex.set(newOrder.idempotencyKey, id);
    }

    this.saveToFile();
    return newOrder;
  }

  public update(id: string, updates: Partial<OrderRecord>): OrderRecord | undefined {
    this.ensureStorage();
    const existing = this.orders.get(id);
    if (!existing) return undefined;

    const updated: OrderRecord = {
      ...existing,
      ...updates,
      id: existing.id, // Immutable
      updatedAt: new Date().toISOString(),
    };

    this.orders.set(id, updated);
    this.saveToFile();
    return updated;
  }

  public list(limit = 100): OrderRecord[] {
    this.ensureStorage();
    return Array.from(this.orders.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  public search(query: string): OrderRecord[] {
    this.ensureStorage();
    const clean = query.trim().toLowerCase();
    if (!clean) return this.list(20);

    return Array.from(this.orders.values()).filter(order => {
      return (
        order.id.toLowerCase().includes(clean) ||
        order.phoneNumber.includes(clean) ||
        order.phoneInternational.includes(clean)
      );
    });
  }

  public delete(id: string): boolean {
    this.ensureStorage();
    const existing = this.orders.get(id);
    if (!existing) return false;

    if (existing.idempotencyKey) {
      this.idempotencyIndex.delete(existing.idempotencyKey);
    }
    this.orders.delete(id);
    this.saveToFile();
    return true;
  }

  public purgeOlderThanDays(days: number): { purgedCount: number } {
    this.ensureStorage();
    const thresholdMs = Date.now() - days * 24 * 60 * 60 * 1000;
    let purgedCount = 0;

    for (const [id, order] of this.orders.entries()) {
      if (new Date(order.createdAt).getTime() < thresholdMs) {
        if (order.idempotencyKey) {
          this.idempotencyIndex.delete(order.idempotencyKey);
        }
        this.orders.delete(id);
        purgedCount++;
      }
    }

    if (purgedCount > 0) {
      this.saveToFile();
    }
    return { purgedCount };
  }

  public getStats() {
    this.ensureStorage();
    const all = Array.from(this.orders.values());
    return {
      totalOrders: all.length,
      sentNotifications: all.filter(o => o.notificationStatus === 'SENT').length,
      pendingNotifications: all.filter(o => o.notificationStatus === 'PENDING').length,
      failedNotifications: all.filter(o => o.notificationStatus === 'FAILED').length,
    };
  }
}

export const db = new DatabaseStore();
