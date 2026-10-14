/**
 * spyxbd - Order Review & Confirmation Modal
 * Handles review, submission, idempotency, loading state, and honest delivery confirmation.
 */

import React, { useState } from 'react';
import {
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Clock,
  Copy,
  Check,
} from 'lucide-react';
import { DeviceLocation, OrderSubmissionResponse } from '../types';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: {
    phoneNumber: string;
    consent: boolean;
    location: DeviceLocation;
  } | null;
  onSuccess: (result: OrderSubmissionResponse) => void;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  orderData,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<OrderSubmissionResponse | null>(null);
  const [copied, setCopied] = useState(false);
  // Persist idempotencyKey across retries of the same modal session
  const [idempotencyKey] = useState(() => `SPX-IDEMP-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`);

  if (!isOpen || !orderData) return null;

  const handleConfirmOrder = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        phoneNumber: orderData.phoneNumber,
        consent: orderData.consent,
        latitude: orderData.location.latitude,
        longitude: orderData.location.longitude,
        accuracy: orderData.location.accuracy,
        locationTimestamp: new Date(orderData.location.timestamp).toISOString(),
        altitude: orderData.location.altitude,
        heading: orderData.location.heading,
        speed: orderData.location.speed,
        idempotencyKey,
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data: OrderSubmissionResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit order. Please check your network and try again.');
      }

      setOrderResult(data);
      onSuccess(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyOrderId = () => {
    if (orderResult?.orderId) {
      navigator.clipboard.writeText(orderResult.orderId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#DCE3EC] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-[#F5F7FA] border-b border-[#DCE3EC] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1769FF]/10 text-[#1769FF] flex items-center justify-center">
              <Send className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#080D18]">
                {orderResult ? 'Order Confirmed' : 'Review & Confirm Order'}
              </h3>
              <p className="text-xs text-[#475569]">spyxbd — Location Service Provider</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#080D18] hover:bg-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {!orderResult ? (
            /* Review Step */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#DCE3EC] space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#475569]">Service</span>
                  <span className="font-semibold text-[#080D18]">Location Service Provider</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#475569]">Customer Phone</span>
                  <span className="font-mono font-bold text-[#080D18] bg-white px-2 py-0.5 rounded border border-[#DCE3EC]">
                    {orderData.phoneNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-t border-[#DCE3EC]/70 pt-2">
                  <span className="text-[#475569]">Original Price</span>
                  <span className="text-[#94A3B8] line-through">750 Tk</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-[#080D18]">Payable Price (40% OFF)</span>
                  <span className="text-xl font-extrabold text-[#1769FF]">450 Tk</span>
                </div>
              </div>

              {/* Coordinates Preview */}
              <div className="p-4 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#1E40AF] font-bold">
                  <span>GPS Telemetry to Submit</span>
                  <a
                    href={`https://www.google.com/maps?q=${orderData.location.latitude},${orderData.location.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:underline text-[#1769FF]"
                  >
                    <span>Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[#1E3A8A] font-mono">
                  <div>
                    <span className="text-[#64748B] block text-[10px] font-sans">Latitude</span>
                    <span>{orderData.location.latitude.toFixed(6)}°</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block text-[10px] font-sans">Longitude</span>
                    <span>{orderData.location.longitude.toFixed(6)}°</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block text-[10px] font-sans">Accuracy</span>
                    <span>±{Math.round(orderData.location.accuracy)} meters</span>
                  </div>
                  <div>
                    <span className="text-[#64748B] block text-[10px] font-sans">Consent</span>
                    <span className="text-[#16A34A] font-bold">Granted</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-[#DC2626] flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 py-3 px-4 rounded-xl border border-[#DCE3EC] text-[#475569] font-semibold text-sm hover:bg-[#F5F7FA] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmOrder}
                  disabled={submitting}
                  className="flex-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#1769FF] hover:bg-[#1255d6] text-white font-bold text-sm shadow-md shadow-[#1769FF]/20 transition-all disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Order...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 fill-current" />
                      <span>Confirm & Submit Order</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Success Step */
            <div className="text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-[#16A34A]/10 text-[#16A34A] mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h4 className="text-2xl font-black text-[#080D18]">
                  Order Submitted Successfully!
                </h4>
                <p className="text-xs sm:text-sm text-[#475569] mt-1">
                  Thank you! Your location service order has been received by spyxbd.
                </p>
              </div>

              {/* Order Reference Badge */}
              <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#DCE3EC] text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-[#64748B] block">Order Reference Number</span>
                    <span className="text-lg font-mono font-black text-[#080D18]">
                      {orderResult.orderId}
                    </span>
                  </div>
                  <button
                    onClick={copyOrderId}
                    className="p-2 rounded-lg bg-white border border-[#DCE3EC] text-[#475569] hover:text-[#1769FF] text-xs font-medium flex items-center gap-1 cursor-pointer"
                    title="Copy Order ID"
                  >
                    {copied ? <Check className="w-4 h-4 text-[#16A34A]" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                {/* Honest Telegram Delivery Status Notice */}
                <div className="mt-3 pt-3 border-t border-[#DCE3EC] text-xs">
                  {orderResult.telegramDelivered ? (
                    <div className="flex items-center gap-2 text-[#16A34A] font-semibold">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Administrator notification successfully delivered to Telegram!</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-[#D97706]">
                      <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        Order saved securely. Telegram notification is currently queued and pending delivery.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <a
                  href="https://t.me/location_service_provider_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 rounded-xl bg-[#1769FF] hover:bg-[#1255d6] text-white font-bold text-sm text-center flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4 fill-current" />
                  <span>Open Telegram Bot</span>
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-5 rounded-xl bg-[#080D18] hover:bg-slate-900 text-white font-bold text-sm transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
