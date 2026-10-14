/**
 * spyxbd - Automated Test Runner Modal (Section 21)
 * Runs live tests across phone validation, coordinates, orders, idempotency, rate limits, and Telegram message formatting.
 */

import React, { useState, useEffect } from 'react';
import { X, Terminal, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

interface TestItem {
  name: string;
  category: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({ isOpen, onClose }) => {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestItem[]>([]);
  const [passedCount, setPassedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [lastRunTime, setLastRunTime] = useState<string | null>(null);

  const runTests = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/test-suite');
      const data = await res.json();
      if (res.ok) {
        setResults(data.results || []);
        setPassedCount(data.passed || 0);
        setFailedCount(data.failed || 0);
        setLastRunTime(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Test suite execution failed:', err);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runTests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#DCE3EC] flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#F5F7FA] border-b border-[#DCE3EC] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1769FF]/10 text-[#1769FF] flex items-center justify-center">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#080D18]">Automated Test Suite</h3>
              <p className="text-xs text-[#475569]">Section 21 Verification: Phone, Geolocation, DB, Telegram, Idempotency</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#080D18] hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-[#DCE3EC] flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[#16A34A] flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              {passedCount} Passed
            </span>
            {failedCount > 0 && (
              <span className="font-semibold text-[#DC2626] flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {failedCount} Failed
              </span>
            )}
            {lastRunTime && (
              <span className="text-[#94A3B8]">Last run: {lastRunTime}</span>
            )}
          </div>
          <button
            onClick={runTests}
            disabled={running}
            className="px-3 py-1.5 rounded-lg bg-[#1769FF] hover:bg-[#1255d6] text-white font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
            <span>Re-run Tests</span>
          </button>
        </div>

        {/* Results List */}
        <div className="p-6 overflow-y-auto space-y-2.5 divide-y divide-[#DCE3EC]/60">
          {results.map((test, idx) => (
            <div key={idx} className="pt-2.5 first:pt-0 flex items-start justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                {test.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-semibold text-[#080D18] block">{test.name}</span>
                  <span className="text-[11px] text-[#64748B]">{test.message}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-[#64748B] font-mono">
                  {test.durationMs}ms
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
