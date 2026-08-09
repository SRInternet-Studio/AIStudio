"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * In-page anchor navigation for GFM footnotes. Both directions must work:
 *  - body marker → source list: the target <li> lives inside a collapsed
 *    <details> wrapper, so open it first (hidden elements cannot scroll);
 *  - ↩ backref → body marker: a plain smooth scroll.
 * Always wait one frame after opening the <details> so it has layout.
 */
function scrollToAnchor(href: string) {
  const el = document.getElementById(href.slice(1));
  if (!el) return;
  const details = el.closest("details");
  if (details && !details.open) details.open = true;
  requestAnimationFrame(() => {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

interface TextBlockProps {
  content: string;
  className?: string;
  /** "muted" renders body text in the muted color (used by thinking blocks). */
  variant?: "default" | "muted";
}

// Memoized: react-markdown parses the full AST on every render, which takes
// seconds for MB-sized blocks. Without memo, ANY messages state change (delete,
// streaming chunk, reload) re-parses every historical block and freezes the UI.
function TextBlockInner({ content, className, variant = "default" }: TextBlockProps) {
  const bodyText = variant === "muted" ? "text-muted" : "text-foreground";
  return (
    <div className={cn("", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className={cn("text-sm leading-relaxed mb-2 last:mb-0", bodyText)}>
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
            <ul className={cn("list-disc list-inside text-sm space-y-1 my-2", bodyText)}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className={cn("list-decimal list-inside text-sm space-y-1 my-2", bodyText)}>
              {children}
            </ol>
          ),
          // GFM footnote references ([^n]) — superscript links to the source
          // list appended by grounding footnotes. Spread props so the
          // user-content-fnref-n id survives (the ↩ backref scrolls to it).
          sup: ({ children, node, ...props }) => (
            <sup className="mx-0.5 text-[10px]" {...props}>{children}</sup>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border-light pl-3 text-sm text-muted italic my-2">
              {children}
            </blockquote>
          ),
          a: ({ href, children, node, ...props }) => {
            // In-page anchors (GFM footnote references like #user-content-fn-1
            // and their ↩ backrefs) must scroll within the page — opening
            // them in a new tab re-launches the whole app instead.
            // Props are spread deliberately: the footnote reference <a> owns
            // the user-content-fnref-n id that ↩ backrefs scroll back to.
            if (href?.startsWith("#")) {
              return (
                <a
                  href={href}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToAnchor(href);
                  }}
                  className="text-accent hover:text-accent-hover underline cursor-pointer"
                  {...props}
                >
                  {children}
                </a>
              );
            }
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:text-accent-hover underline"
                {...props}
              >
                {children}
              </a>
            );
          },
          // GFM renders footnote definitions inside <section class="footnotes">
          // — they are citations, not body text, so wrap them in a collapsed
          // <details> and force the number + link onto one line.
          section: ({ children, className }) => {
            if ((className || "").includes("footnotes")) {
              return (
                <details className="mt-3 pt-2 border-t border-border/60">
                  <summary className="text-xs text-muted cursor-pointer select-none hover:text-foreground w-fit">
                    🌐 Sources 来源引用
                  </summary>
                  <div className="mt-2 text-xs text-muted [&_hr]:!hidden [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_p]:!inline [&_p]:!mb-0 [&_p]:!text-xs [&_p]:!text-muted">
                    {children}
                  </div>
                </details>
              );
            }
            return <section className={className}>{children}</section>;
          },
          h1: ({ children }) => (
            <h1 className="text-lg font-bold text-foreground mt-4 mb-2">{children}</h1>
          ),
          h2: ({ children, className }) => (
            // Preserve passed classes — the footnote section's label h2
            // carries "sr-only" and must stay visually hidden.
            <h2 className={cn("text-base font-bold text-foreground mt-3 mb-2", className)}>{children}</h2>
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

const TextBlock = memo(TextBlockInner);
export default TextBlock;
