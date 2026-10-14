-- spyxbd PostgreSQL initial migration
CREATE TYPE "OrderStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'CONFIRMED', 'CANCELLED');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'RETRYING');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID');

CREATE TABLE IF NOT EXISTS "Order" (
    "id" TEXT PRIMARY KEY,
    "phoneNumber" TEXT NOT NULL,
    "consentGranted" BOOLEAN NOT NULL DEFAULT true,
    "consentTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracyMeters" DOUBLE PRECISION NOT NULL,
    "locationTimestamp" TIMESTAMP(3) NOT NULL,
    "altitude" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "originalPrice" DOUBLE PRECISION NOT NULL DEFAULT 750.0,
    "discountedPrice" DOUBLE PRECISION NOT NULL DEFAULT 450.0,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "status" "OrderStatus" NOT NULL DEFAULT 'RECEIVED',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "notificationStatus" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "notificationError" TEXT,
    "notificationRetries" INTEGER NOT NULL DEFAULT 0,
    "telegramMessageId" TEXT,
    "customerTokenHash" TEXT,
    "idempotencyKey" TEXT UNIQUE,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Order_phoneNumber_idx" ON "Order"("phoneNumber");
CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");
CREATE INDEX IF NOT EXISTS "Order_notificationStatus_idx" ON "Order"("notificationStatus");
