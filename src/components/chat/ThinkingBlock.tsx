"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";

interface ThinkingBlockProps {
  content: string;
}

export default function ThinkingBlock({ content }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 text-left"
      >
        <Sparkles className="w-4 h-4 text-accent" />
        <span className="text-sm font-medium text-foreground">Thoughts</span>
        <div className="flex-1" />
        <span className="text-xs text-muted">
          {expanded ? "Collapse" : "Expand to view model thoughts"}
        </span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        </div>
      )}
    </div>
  );
}
