/**
 * spyxbd - Header Navigation Component
 * Minimal header with brand logo.
 */

import React from 'react';
import { MapPin } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#DCE3EC] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Lockup: Blue Pin + spyxbd */}
        <a
          href="/"
          className="flex items-center gap-2.5 text-decoration-none group cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <div className="w-9 h-9 rounded-full bg-[#1769FF]/10 flex items-center justify-center text-[#1769FF] group-hover:bg-[#1769FF] group-hover:text-white transition-all duration-200">
            <MapPin className="w-5 h-5 fill-current" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-[#080D18]">
            spyxbd
          </span>
        </a>
      </div>
    </header>
  );
};
