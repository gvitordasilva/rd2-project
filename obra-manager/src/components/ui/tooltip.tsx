"use client";
import { HelpCircle } from "lucide-react";

interface TooltipProps {
  text: string;
  className?: string;
}

export function TooltipIcon({ text, className = "" }: TooltipProps) {
  return (
    <span className={`relative inline-flex group ${className}`}>
      <HelpCircle className="w-3.5 h-3.5 text-[var(--muted-foreground)] cursor-help" />
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-lg bg-gray-900 text-white text-xs px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg leading-relaxed">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}
