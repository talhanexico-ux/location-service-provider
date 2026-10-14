/**
 * spyxbd - Privacy Policy & Terms Modal
 * Outlines data handling, consensual device telemetry, Telegram routing, and deletion rights.
 */

import React from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'privacy' | 'terms';
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  mode = 'privacy',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#DCE3EC] flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#F5F7FA] border-b border-[#DCE3EC] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#1769FF]" />
            <h3 className="text-lg font-bold text-[#080D18]">
              {mode === 'privacy' ? 'Privacy Policy & Data Disclosure' : 'Terms & Conditions'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#080D18] hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-[#475569] leading-relaxed">
          {mode === 'privacy' ? (
            <p>
              We  contact <span className="font-mono text-[#080D18]">@spyxbd</span> to on.
            </p>
          ) : (
            <p>
              By  
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#F5F7FA] border-t border-[#DCE3EC] flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#080D18] text-white text-xs font-bold hover:bg-slate-900 transition-colors cursor-pointer"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
