/**
 * spyxbd - Features Section Component
 * Displays the 5 core features in a responsive grid with pale blue circle icons.
 */

import React from 'react';
import { Target, ShieldCheck, Zap, Smartphone, Headphones } from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  const features = [
    {
      id: 'real-time',
      title: 'Real-Time Location',
      description: 'Get the current device location with explicit permission.',
      icon: Target,
    },
    {
      id: 'privacy',
      title: 'Privacy Focused',
      description: 'Your location is requested only after you choose to share it.',
      icon: ShieldCheck,
    },
    {
      id: 'fast-reliable',
      title: 'Fast & Reliable',
      description: 'Simple order submission with clear status feedback.',
      icon: Zap,
    },
    {
      id: 'all-devices',
      title: 'Works on All Devices',
      description: 'Responsive design for mobile, tablet, and desktop.',
      icon: Smartphone,
    },
    {
      id: 'support',
      title: 'Customer Support',
      description: 'Contact the service administrator for order assistance.',
      icon: Headphones,
    },
  ];

  return (
    <section id="features" className="bg-white py-14 sm:py-20 border-b border-[#DCE3EC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#080D18] tracking-tight">
            Designed for Accuracy & Privacy
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[#475569]">
            Everything you need for seamless, transparent, and consensual location sharing in Bangladesh.
          </p>
        </div>

        {/* 5-Card Responsive Grid: 2 columns on mobile, 5 columns on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 sm:gap-8 items-start">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            const isLastOnMobile = idx === 4;

            return (
              <div
                key={feature.id}
                className={`flex flex-col items-center text-center p-4 sm:p-5 rounded-2xl hover:bg-[#F5F7FA] transition-colors group ${
                  isLastOnMobile ? 'col-span-2 md:col-span-1 mx-auto max-w-[280px] md:max-w-none' : ''
                }`}
              >
                {/* Pale blue circular background with blue line icon */}
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#EFF6FF] border border-[#BFDBFE]/60 flex items-center justify-center text-[#1769FF] mb-4 group-hover:scale-105 group-hover:bg-[#1769FF] group-hover:text-white transition-all duration-200 shadow-xs">
                  <Icon className="w-8 h-8" strokeWidth={1.8} />
                </div>

                <h3 className="text-base sm:text-lg font-bold text-[#080D18] mb-1.5 leading-snug">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
