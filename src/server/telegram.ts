/**
 * spyxbd - Telegram Bot Integration Service
 * Manages admin notifications to Chat ID 8220144989 (@talhajubayer001)
 */

import { db, OrderRecord } from './db.js';

export interface TelegramConfig {
  botToken?: string;
  chatId: string;
  adminUsername: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  simulated?: boolean;
}

interface TelegramCallbackUpdate {
  callback_query?: {
    id: string;
    data?: string;
    from: { id: number };
    message?: { chat: { id: number }; message_id: number; text?: string };
  };
}

export class TelegramService {
  private getBotToken(): string | undefined {
    return process.env.TELEGRAM_BOT_TOKEN;
  }

  private getChatId(): string {
    return process.env.TELEGRAM_CHAT_ID || '8220144989';
  }

  private getAdminUsername(): string {
    return process.env.TELEGRAM_ADMIN_USERNAME || 'notepadsupport';
  }

  public getConfig(): TelegramConfig {
    const token = this.getBotToken();
    return {
      botToken: token ? `${token.substring(0, 4)}...${token.slice(-4)}` : undefined,
      chatId: this.getChatId(),
      adminUsername: this.getAdminUsername(),
    };
  }

  public isConfigured(): boolean {
    const token = this.getBotToken();
    return Boolean(token && token.trim().length > 10 && !token.includes('placeholder'));
  }

  public async configureWebhook(): Promise<void> {
    const baseUrl = process.env.APP_BASE_URL;
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!this.isConfigured() || !baseUrl || !secret) return;

    try {
      const webhookUrl = new URL('/api/telegram/webhook', baseUrl);
      if (webhookUrl.protocol !== 'https:') return;
      const token = this.getBotToken();
      const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl.toString(),
          secret_token: secret,
          allowed_updates: ['callback_query'],
        }),
      });
      const result = await response.json() as { ok: boolean; description?: string };
      if (!result.ok) console.error('[Telegram] Webhook registration failed:', result.description);
    } catch (error) {
      console.error('[Telegram] Webhook registration failed:', error);
    }
  }

  public async handleCallbackUpdate(
    update: TelegramCallbackUpdate,
    allowedAdminIds: number[],
  ): Promise<{ success: boolean; error?: string }> {
    const callback = update.callback_query;
    if (!callback?.message || !callback.data) return { success: false, error: 'Invalid callback.' };
    if (!allowedAdminIds.includes(callback.from.id)) return { success: false, error: 'Unauthorized admin.' };
    if (!Number.isFinite(Number(this.getChatId())) || callback.message.chat.id !== Number(this.getChatId())) {
      return { success: false, error: 'Unexpected Telegram chat.' };
    }

    const [action, orderId] = callback.data.split(':');
    const order = orderId ? db.getById(orderId) : undefined;
    if (!order || (action !== 'approve' && action !== 'delete')) {
      await this.answerCallback(callback.id, 'This order is no longer available.');
      return { success: false, error: 'Order not found or invalid action.' };
    }

    if (action === 'approve') {
      db.update(order.id, { status: 'CONFIRMED', paymentStatus: 'PAID' });
      await this.answerCallback(callback.id, 'Payment confirmed and order approved.');
      await this.editMessage(
        callback.message.chat.id,
        callback.message.message_id,
        `${callback.message.text || this.buildOrderMessage(order)}\n\nPayment marked PAID; order approved.`,
      );
      return { success: true };
    }

    db.delete(order.id);
    await this.answerCallback(callback.id, 'Order deleted.');
    await this.editMessage(callback.message.chat.id, callback.message.message_id, 'Order deleted by admin.');
    return { success: true };
  }

  private async answerCallback(callbackId: string, text: string): Promise<void> {
    const token = this.getBotToken();
    if (!token) return;
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackId, text }),
    });
  }

  private async editMessage(chatId: number, messageId: number, text: string): Promise<void> {
    const token = this.getBotToken();
    if (!token) return;
    await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        disable_web_page_preview: true,
      }),
    });
  }

  /**
   * Builds the official SPYXBD notification message body
   */
  public buildOrderMessage(order: OrderRecord): string {
    const lat = order.latitude.toFixed(6);
    const lng = order.longitude.toFixed(6);
    const acc = Math.round(order.accuracyMeters);
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

    return [
      `🔔 NEW SPYXBD ORDER`,
      ``,
      `Order ID: ${order.id}`,
      `Service: Location Service Provider`,
      `Original price: ${order.originalPrice} Tk`,
      `Discounted price: ${order.discountedPrice} Tk`,
      ``,
      `Customer phone: ${order.phoneInternational} (${order.phoneNumber})`,
      order.operator ? `Network: ${order.operator}` : '',
      ``,
      `LOCATION INFORMATION`,
      `Latitude: ${lat}`,
      `Longitude: ${lng}`,
      `Reported accuracy: ${acc} meters`,
      `Location timestamp: ${new Date(order.locationTimestamp).toISOString()}`,
      order.altitude != null ? `Altitude: ${Math.round(order.altitude)} meters` : '',
      ``,
      `Customer consent: Confirmed`,
      `Order status: ${order.status}`,
      ``,
      `Open location in map:`,
      `${mapsUrl}`,
    ].filter(Boolean).join('\n');
  }

  /**
   * Dispatches order notification via Telegram Bot API
   */
  public async sendOrderNotification(order: OrderRecord): Promise<SendResult> {
    const messageText = this.buildOrderMessage(order);

    if (!this.isConfigured()) {
      const reason = 'TELEGRAM_BOT_TOKEN is not configured in backend environment. Notification is queued.';
      db.update(order.id, {
        notificationStatus: 'PENDING',
        notificationError: reason,
      });
      return {
        success: false,
        error: reason,
        simulated: true,
      };
    }

    try {
      const token = this.getBotToken();
      const chatId = this.getChatId();
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          disable_web_page_preview: false,
          reply_markup: {
            inline_keyboard: [[
              { text: 'Confirm payment & approve', callback_data: `approve:${order.id}` },
              { text: 'Delete order', callback_data: `delete:${order.id}` },
            ]],
          },
        }),
      });

      const data = await response.json() as { ok: boolean; result?: { message_id: number }; description?: string };

      if (data.ok && data.result) {
        const msgId = String(data.result.message_id);
        db.update(order.id, {
          notificationStatus: 'SENT',
          notificationError: null,
          telegramMessageId: msgId,
        });
        return { success: true, messageId: msgId };
      } else {
        const errDesc = data.description || 'Unknown Telegram API error';
        db.update(order.id, {
          notificationStatus: 'FAILED',
          notificationError: errDesc,
          notificationRetries: order.notificationRetries + 1,
        });
        return { success: false, error: errDesc };
      }
    } catch (networkErr: unknown) {
      const message = networkErr instanceof Error ? networkErr.message : 'Network error communicating with Telegram';
      db.update(order.id, {
        notificationStatus: 'FAILED',
        notificationError: message,
        notificationRetries: order.notificationRetries + 1,
      });
      return { success: false, error: message };
    }
  }

  /**
   * Sends diagnostic test notification to verify bot setup
   */
  public async sendTestMessage(): Promise<SendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'TELEGRAM_BOT_TOKEN not configured. Please set TELEGRAM_BOT_TOKEN in your environment or Secrets.',
      };
    }

    try {
      const token = this.getBotToken();
      const chatId = this.getChatId();
      const adminUsername = this.getAdminUsername();
      const testText = `🧪 SPYXBD Diagnostic\n\nTelegram Bot integration is online and active!\nAdmin: @${adminUsername}\nTarget Chat ID: ${chatId}\nTimestamp: ${new Date().toISOString()}`;
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: testText,
        }),
      });

      const data = await response.json() as { ok: boolean; result?: { message_id: number }; description?: string };
      if (data.ok && data.result) {
        return { success: true, messageId: String(data.result.message_id) };
      } else {
        return { success: false, error: data.description || 'Telegram Bot API error' };
      }
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Connection failed' };
    }
  }

  /**
   * Background retry worker: looks for PENDING or FAILED notifications and retries up to 3 times
   */
  public async processRetryQueue(): Promise<{ processed: number; successful: number }> {
    if (!this.isConfigured()) return { processed: 0, successful: 0 };

    const allOrders = db.list(50);
    const retryable = allOrders.filter(
      o => (o.notificationStatus === 'PENDING' || o.notificationStatus === 'FAILED') && o.notificationRetries < 3
    );

    let successful = 0;
    for (const order of retryable) {
      const result = await this.sendOrderNotification(order);
      if (result.success) successful++;
    }

    return { processed: retryable.length, successful };
  }
}

export const telegramService = new TelegramService();
