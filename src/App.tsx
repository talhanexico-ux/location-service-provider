/**
 * spyxbd - Location Service Provider
 * Streamlined application focusing on location service ordering with explicit consent and privacy policy.
 */

import { useState } from 'react';
import { Header } from './components/Header';
import { HeroOrderSection } from './components/HeroOrderSection';
import { Footer } from './components/Footer';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';

export default function App() {
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [legalMode, setLegalMode] = useState<'privacy' | 'terms'>('privacy');

  const handleOpenPrivacy = () => {
    setLegalMode('privacy');
    setLegalModalOpen(true);
  };

  const handleOpenTerms = () => {
    setLegalMode('terms');
    setLegalModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#080D18] flex flex-col font-sans selection:bg-[#1769FF]/20 selection:text-[#1769FF]">
      {/* 1. Header Navigation */}
      <Header />

      {/* 2. Core Location Service Ordering Section */}
      <main className="flex-1 flex flex-col justify-center">
        <HeroOrderSection />
      </main>

      {/* 3. Deep Navy Footer with Privacy Policy & Terms */}
      <Footer
        onOpenPrivacy={handleOpenPrivacy}
        onOpenTerms={handleOpenTerms}
      />

      {/* 4. Privacy Policy & Terms Modal */}
      <PrivacyPolicyModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        mode={legalMode}
      />
    </div>
  );
}
