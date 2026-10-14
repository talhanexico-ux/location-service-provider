/**
 * spyxbd - How It Works Section Component
 * 3 Simple Steps with numbered badges, icons, and connecting arrows.
 */

import React from 'react';
import { Smartphone, Navigation, CheckCircle2, ArrowRight } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      step: 1,
      title: 'Enter Your Number',
      description: 'Enter your contact number and review the service price.',
      icon: Smartphone,
    },
    {
      step: 2,
      title: 'Share Your Location',
      description: 'Grant permission and review the coordinates returned by your device.',
      icon: Navigation,
    },
    {
      step: 3,
      title: 'Submit Your Order',
      description: 'Confirm your order and receive an order reference.',
      icon: CheckCircle2,
    },
  ];

  return (
    <section id="how-it-works" className="bg-[#F5F7FA] py-16 sm:py-20 border-b border-[#DCE3EC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs sm:text-sm font-bold tracking-widest text-[#1769FF] uppercase">
            HOW IT WORKS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#080D18] tracking-tight mt-1.5">
            Get Started in 3 Simple Steps
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[#475569]">
            A transparent and respectful workflow designed for consenting customers.
          </p>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;

            return (
              <div
                key={step.step}
                className="relative bg-white rounded-2xl p-6 sm:p-8 border border-[#DCE3EC] shadow-sm flex flex-col items-center text-center transition-all hover:shadow-md"
              >
                {/* Step Number Circle */}
                <div className="w-8 h-8 rounded-full bg-[#1769FF] text-white text-sm font-bold flex items-center justify-center mb-4 shadow-sm">
                  {step.step}
                </div>

                {/* Step Icon */}
                <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] text-[#1769FF] flex items-center justify-center mb-5 border border-[#BFDBFE]">
                  <Icon className="w-8 h-8" strokeWidth={1.8} />
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-[#080D18] mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed">
                  {step.description}
                </p>

                {/* Connecting Arrow for Desktop */}
                {idx < 2 && (
                  <div className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-[#DCE3EC] shadow-sm items-center justify-center text-[#1769FF]">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
