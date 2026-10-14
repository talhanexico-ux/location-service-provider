/**
 * spyxbd - Order Status Lookup Modal
 * Allows customers to track their order status using their Order ID or Phone Number.
 */

import React, { useState } from 'react';
import { X, Search, Clock, CheckCircle2, AlertCircle, ExternalLink, Loader2 } from 'lucide-react';
import { OrderItem } from '../types';

interface OrderLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrderLookupModal: React.FC<OrderLookupModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [searched, setSearched] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await fetch(`/api/orders/lookup?query=${encodeURIComponent(query.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to search orders');
      }

      setOrders(data.results || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#DCE3EC] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-[#F5F7FA] border-b border-[#DCE3EC] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-[#1769FF]" />
            <h3 className="text-lg font-bold text-[#080D18]">Track Your Order</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#080D18] hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label htmlFor="searchQuery" className="block text-xs font-semibold text-[#475569] mb-1">
                Order ID or Phone Number
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="searchQuery"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. SPX-261013-XXXX or 01712345678"
                  className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-[#DCE3EC] text-[#080D18] focus:border-[#1769FF] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="px-5 py-2.5 bg-[#1769FF] hover:bg-[#1255d6] text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  <span>Search</span>
                </button>
              </div>
            </div>
          </form>

          {/* Results Display */}
          <div className="mt-5 max-h-72 overflow-y-auto space-y-3">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-xs text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {searched && !loading && orders.length === 0 && !error && (
              <div className="p-6 text-center text-xs text-[#94A3B8]">
                No orders found matching "{query}". Please check the Order ID or phone number.
              </div>
            )}

            {orders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#DCE3EC] text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[#080D18]">{order.id}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF6FF] text-[#1769FF] border border-[#BFDBFE]">
                    {order.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[#475569]">
                  <div>
                    <span className="text-[10px] text-[#94A3B8] block">Customer Phone</span>
                    <span className="font-medium text-[#080D18]">{order.phoneNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#94A3B8] block">Date</span>
                    <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#DCE3EC] flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    {order.notificationStatus === 'SENT' ? (
                      <span className="flex items-center gap-1 text-[#16A34A] font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Admin Notified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[#D97706] font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        Notification Pending
                      </span>
                    )}
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1769FF] hover:underline flex items-center gap-1"
                  >
                    <span>View Coordinates</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
