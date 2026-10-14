/**
 * spyxbd - Shared Types & Interfaces
 */

export interface DeviceLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  addressSummary?: string;
}

export type OrderStatus = 'RECEIVED' | 'PROCESSING' | 'CONFIRMED' | 'CANCELLED';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'RETRYING';
export type PaymentStatus = 'PENDING' | 'PAID';

export interface OrderItem {
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
  createdAt: string;
  updatedAt: string;
}

export interface OrderSubmissionPayload {
  phoneNumber: string;
  consent: boolean;
  latitude: number;
  longitude: number;
  accuracy: number;
  locationTimestamp: string;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  idempotencyKey?: string;
  customerAccessToken: string;
}

export interface OrderSubmissionResponse {
  success: boolean;
  orderId?: string;
  status?: OrderStatus;
  notificationStatus?: NotificationStatus;
  message?: string;
  error?: string;
  telegramDelivered?: boolean;
  order?: OrderItem;
}
