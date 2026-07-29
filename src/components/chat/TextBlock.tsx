"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface TextBlockProps {
  content: string;
  className?: string;
}

export default function TextBlock({ content, className }: TextBlockProps) {
  return (
    <div className={cn("", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="text-sm text-foreground leading-relaxed mb-2 last:mb-0">
              {children}
            </p>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-surface-variant px-1.5 py-0.5 rounded text-xs font-mono text-accent">
                  {children}
                </code>
              );
            }
            return (
              <div className="my-3 rounded-lg overflow-hidden border border-border">
                <div className="bg-surface-variant px-3 py-1.5 text-xs text-muted flex items-center justify-between">
                  <span>Code</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(String(children))}
                    className="text-muted hover:text-foreground transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <pre className="bg-background p-3 overflow-x-auto">
                  <code className="text-xs font-mono text-foreground" {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
          ul: ({ children }) => (
            <ul className="list-disc list-inside text-sm text-foreground space-y-1 my-2">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside text-sm text-foreground space-y-1 my-2">
              {children}
            </ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border-light pl-3 text-sm text-muted italic my-2">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-hover underline"
            >
              {children}
            </a>
          ),
          h1: ({ children }) => (
            <h1 className="text-lg font-bold text-foreground mt-4 mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold text-foreground mt-3 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold text-foreground mt-2 mb-1">{children}</h3>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border px-3 py-2 bg-surface-variant text-left text-foreground font-medium">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border px-3 py-2 text-foreground">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
