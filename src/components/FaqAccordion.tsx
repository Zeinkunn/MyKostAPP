'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface FaqItem {
  question: string;
  answer: string;
  category?: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
}

export default function FaqAccordion({ items }: FaqAccordionProps) {
  const [openIndexes, setOpenIndexes] = useState<number[]>([0]); // Open first item by default

  const toggle = (index: number) => {
    setOpenIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const isOpen = openIndexes.includes(index);
        const headingId = `faq-heading-${index}`;
        const panelId = `faq-panel-${index}`;

        return (
          <div
            key={index}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all duration-200"
          >
            <button
              type="button"
              id={headingId}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(index)}
              className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-50/80 active:bg-slate-100/60 transition-colors cursor-pointer group"
            >
              <div className="min-w-0 pr-2">
                {item.category && (
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-0.5">
                    {item.category}
                  </span>
                )}
                <span className="text-xs md:text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                  {item.question}
                </span>
              </div>
              <div
                className={`w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 bg-blue-50 text-blue-600' : ''
                }`}
              >
                <ChevronDown className="w-4 h-4" />
              </div>
            </button>

            {isOpen && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={headingId}
                className="px-4 pb-4 pt-1 border-t border-slate-100 text-xs text-slate-600 leading-relaxed space-y-2 animate-in fade-in duration-200"
              >
                <p>{item.answer}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
