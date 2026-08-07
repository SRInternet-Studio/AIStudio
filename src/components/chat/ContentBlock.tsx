"use client";

import type { BlockType } from "@/types";
import { cn } from "@/lib/utils";

interface ContentBlockProps {
  type: BlockType;
  children: React.ReactNode;
  className?: string;
  onDelete?: () => void;
  onBranch?: () => void;
}

const typeLabels: Record<BlockType, string> = {
  text: "Text",
  image: "Image",
  video: "Video",
  audio: "Audio",
  pdf: "PDF",
  file: "File",
  thinking: "Thinking",
  tool_result: "Tool Result",
};

const typeIcons: Record<BlockType, string> = {
  text: "",
  image: "🖼️",
  video: "🎬",
  audio: "🎵",
  pdf: "📄",
  file: "📎",
  thinking: "💭",
  tool_result: "🔧",
};

export default function ContentBlock({
  type,
  children,
  className,
}: ContentBlockProps) {
  return (
    <div
      className={cn(
        "block-card relative group",
        type === "thinking" && "border-l-2 border-l-accent/50",
        type === "tool_result" && "border-l-2 border-l-accent",
        className
      )}
    >
      {type !== "text" && (
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
          <span className="text-sm">{typeIcons[type]}</span>
          <span className="text-xs font-medium text-muted uppercase tracking-wider">
            {typeLabels[type]}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
