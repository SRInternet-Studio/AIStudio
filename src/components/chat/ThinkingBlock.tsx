"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import TextBlock from "./TextBlock";

interface ThinkingBlockProps {
  content: string;
  defaultExpanded?: boolean;
}

export default function ThinkingBlock({ content, defaultExpanded = false }: ThinkingBlockProps) {
  // Issue 3: Thinking block defaults to COLLAPSED. Streaming preview can pass defaultExpanded.
  const [expanded, setExpanded] = useState(defaultExpanded);
  console.log("[ThinkingBlock] render, defaultExpanded:", defaultExpanded, "expanded:", expanded);

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
          {/* Thought summaries are markdown (headings, bold, lists, code) —
              render them with the same pipeline as normal text, muted. */}
          <TextBlock content={content} variant="muted" />
        </div>
      )}
    </div>
  );
}
