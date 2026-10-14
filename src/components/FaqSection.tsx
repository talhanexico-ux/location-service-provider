/**
 * spyxbd - FAQ Section Component
 * Accessible accordion with 7 transparent and honest questions & answers.
 */

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const FaqSection: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>('q1');

  const faqs: FaqItem[] = [
    {
      id: 'q1',
      question: 'How does this service work?',
      answer:
        'spyxbd allows you to easily capture and securely share your current device location with our service administrator for order fulfillment. After you provide your contact phone number, consent to sharing, and grant browser permission, your device returns its exact GPS coordinates and reported accuracy, which are transmitted securely to our administrator via Telegram.',
    },
    {
      id: 'q2',
      question: 'Why does the website request location permission?',
      answer:
        'Modern web browsers strictly enforce user privacy. A website cannot access your physical position unless you explicitly approve the browser prompt. We request this permission once so your device can read its GPS hardware and include your verified coordinates in your order.',
    },
    {
      id: 'q3',
      question: 'Can the website locate any phone number?',
      answer:
        'No. A standard website cannot track or locate another person’s phone simply by typing in their phone number. Cellular carrier networks and operating systems do not allow arbitrary web apps to access remote third-party GPS sensors. The location collected by spyxbd is strictly the consenting customer’s own current device location.',
    },
    {
      id: 'q4',
      question: 'Why might my location accuracy vary?',
      answer:
        'GPS accuracy depends on your device hardware, environmental obstacles (such as high-rise buildings or indoor concrete walls), and whether your device has clear satellite line-of-sight. When indoors, your device may rely on Wi-Fi or cellular triangulation, which has an accuracy of ±20m to ±100m. Moving outdoors or near an open window usually improves accuracy to within ±3m to ±10m.',
    },
    {
      id: 'q5',
      question: 'What happens if I deny location permission?',
      answer:
        'If you deny location permission, no coordinates are retrieved or recorded. Your phone number is preserved in the form, and you will see instructions on how to re-enable location permission in your browser address bar settings if you choose to proceed later.',
    },
    {
      id: 'q6',
      question: 'How will my order be sent to the administrator?',
      answer:
        'Once you confirm your order, our backend server validates your phone number, consent, and coordinates. It saves the order in our secure database and immediately dispatches a formatted notification to our service administrator (@talhajubayer001 / ID 8220144989) via the Telegram Bot API.',
    },
    {
      id: 'q7',
      question: 'How can I contact support?',
      answer:
        'You can reach our service administrator directly on Telegram at @talhajubayer001 or through our customer support channels. You can also use the "Track Order" feature on this website using your Order ID to check your order processing status anytime.',
    },
  ];

  const toggle = (id: string) => {
    setOpenId(openId === id ? null : id);
  };

  return (
    <section id="faq" className="bg-white py-16 sm:py-20 border-b border-[#DCE3EC]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs sm:text-sm font-bold tracking-widest text-[#1769FF] uppercase">
            FREQUENTLY ASKED QUESTIONS
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#080D18] tracking-tight mt-1.5">
            Transparent Answers
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[#475569]">
            Have questions about how location sharing works? We believe in total clarity and privacy.
          </p>
        </div>

        {/* Accordion list */}
        <div className="space-y-3.5">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id;

            return (
              <div
                key={faq.id}
                className="border border-[#DCE3EC] rounded-2xl overflow-hidden transition-colors bg-[#F8FAFC]/50 hover:bg-[#F8FAFC]"
              >
                <button
                  type="button"
                  onClick={() => toggle(faq.id)}
                  aria-expanded={isOpen}
                  className="w-full px-5 py-4 sm:px-6 sm:py-5 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1769FF] focus:ring-inset"
                >
                  <span className="text-base sm:text-lg font-bold text-[#080D18]">
                    {faq.question}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-full bg-white border border-[#DCE3EC] flex items-center justify-center text-[#1769FF] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 bg-[#1769FF] text-white border-transparent' : ''
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-sm sm:text-base text-[#475569] leading-relaxed border-t border-[#DCE3EC]/60 pt-3">
                    {faq.answer}
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
