/**
 * spyxbd - Footer Component
 * Clean footer displaying Privacy Policy and Terms & Conditions.
 */

import React from 'react';

interface FooterProps {
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenPrivacy,
  onOpenTerms,
}) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#080D18] text-[#94A3B8] border-t border-slate-800/80 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-6">
          <button
            onClick={onOpenPrivacy}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Privacy Policy
          </button>
          <button
            onClick={onOpenTerms}
            className="hover:text-white transition-colors cursor-pointer"
          >
            Terms & Conditions
          </button>
        </div>

        <p>© {currentYear} spyxbd</p>
      </div>
    </footer>
  );
};
