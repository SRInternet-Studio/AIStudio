"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { useChatStore } from "@/store/chatStore";
import {
  BookOpen,
  FileText,
  Scale,
  Code2,
  Shield,
  Heart,
  Handshake,
  AlertCircle,
  Languages,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DocView =
  | "welcome"
  | "readme"
  | "license"
  | "development"
  | "security"
  | "contributing"
  | "code-of-conduct"
  | "disclaimer";

const docTabs: { id: DocView; label: string; icon: any }[] = [
  { id: "welcome", label: "Welcome", icon: BookOpen },
  { id: "readme", label: "README", icon: FileText },
  { id: "license", label: "LICENSE", icon: Scale },
  { id: "development", label: "Development Guide", icon: Code2 },
  { id: "security", label: "Security", icon: Shield },
  { id: "contributing", label: "Contributing", icon: Heart },
  { id: "code-of-conduct", label: "Code of Conduct", icon: Handshake },
  { id: "disclaimer", label: "Disclaimer", icon: AlertCircle },
];

// Internal .md links inside the documents switch tabs instead of navigating away.
const MD_LINK_TO_TAB: Record<string, DocView> = {
  "welcome.md": "welcome",
  "readme.md": "readme",
  "license.md": "license",
  "development.md": "development",
  "security.md": "security",
  "contributing.md": "contributing",
  "code_of_conduct.md": "code-of-conduct",
  "disclaimer.md": "disclaimer",
};

export default function DocumentationPage() {
  const { documentationView, setDocumentationView } = useChatStore();
  const [lang, setLang] = useState<"en" | "zh">("en");
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/docs?doc=${documentationView}&lang=${lang}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success && data.data) {
          console.log("[Documentation] Loaded doc:", documentationView, "lang:", lang);
          setContent(data.data.content || "");
        } else {
          console.error("[Documentation] Failed to load doc:", data.error);
          setContent("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[Documentation] Doc fetch failed:", err);
          setContent("");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [documentationView, lang]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="border-b border-border px-6 bg-background flex-shrink-0">
        <div className="flex items-center gap-1">
          <div className="flex gap-1 overflow-x-auto flex-1">
            {docTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDocumentationView(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all duration-150 whitespace-nowrap",
                  documentationView === tab.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted hover:text-foreground hover:border-border"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
          {/* Language switch: EN ↔ 中文 */}
          <button
            onClick={() => setLang(lang === "en" ? "zh" : "en")}
            className="flex items-center gap-1.5 px-3 py-1.5 ml-2 my-1 text-xs font-medium text-muted hover:text-foreground border border-border rounded-lg hover:bg-surface-variant transition-all duration-150 flex-shrink-0"
            title={lang === "en" ? "切换到中文" : "Switch to English"}
          >
            <Languages className="w-3.5 h-3.5" />
            {lang === "en" ? "中文" : "English"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-4xl mx-auto p-6 md:p-10">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-muted">Loading documentation…</p>
            </div>
          ) : (
            <article className="markdown-doc">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-3xl font-bold text-foreground mb-6">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-semibold text-foreground mt-8 mb-3">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-base font-semibold text-foreground mt-6 mb-2">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="text-sm text-foreground/90 leading-relaxed mb-3">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-6 space-y-1.5 text-sm text-foreground/90 mb-4">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-6 space-y-1.5 text-sm text-foreground/90 mb-4">{children}</ol>
                  ),
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  a: ({ href, children }) => {
                    const target = href ? MD_LINK_TO_TAB[href.split("/").pop()!.toLowerCase()] : undefined;
                    if (target) {
                      return (
                        <button
                          onClick={() => setDocumentationView(target)}
                          className="text-primary hover:text-accent transition-colors underline underline-offset-2"
                        >
                          {children}
                        </button>
                      );
                    }
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-accent transition-colors underline underline-offset-2"
                      >
                        {children}
                      </a>
                    );
                  },
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-primary/40 pl-4 my-4 text-muted italic">
                      {children}
                    </blockquote>
                  ),
                  code: ({ className, children, ...props }) => {
                    const isBlock = className?.includes("language-");
                    if (isBlock) {
                      return (
                        <code className="block bg-input border border-border rounded-lg p-4 text-xs font-mono overflow-x-auto my-4">
                          {children}
                        </code>
                      );
                    }
                    return (
                      <code className="bg-input rounded px-1 py-0.5 text-xs font-mono" {...props}>
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => <pre className="contents">{children}</pre>,
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-4 border border-border rounded-lg">
                      <table className="w-full text-sm">{children}</table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-surface-variant/60 text-left">{children}</thead>
                  ),
                  th: ({ children }) => (
                    <th className="px-3 py-2 font-medium text-foreground border-b border-border">{children}</th>
                  ),
                  td: ({ children }) => (
                    <td className="px-3 py-2 text-foreground/90 border-b border-border/50">{children}</td>
                  ),
                  hr: () => <hr className="border-border my-6" />,
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                  img: ({ src, alt }) => {
                    // Rewrite relative Picture paths to the public/ served path
                    const normalized = src
                      ?.replace(/^\.\.\//, "/")
                      .replace(/^Pictures\//, "/Pictures/");
                    return (
                      <img
                        src={normalized}
                        alt={alt || ""}
                        className="rounded-lg border border-border my-2 max-w-full"
                        loading="lazy"
                      />
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
