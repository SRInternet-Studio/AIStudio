"use client";

import { useChatStore } from "@/store/chatStore";
import {
  Compass,
  Clock,
  LayoutDashboard,
  FileText,
  ChevronRight,
  ExternalLink,
  Trash2,
  Pencil,
  X as XIcon,
  Settings,
  Sun,
  Moon,
  Monitor,
  List,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  ChevronDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Conversation } from "@/types";

const exploreItems = [
  { id: "playground" as const, label: "Playground", icon: Compass },
  { id: "history" as const, label: "History", icon: Clock },
];

const manageItems = [
  { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard, hasArrow: true },
  { id: "documentation" as const, label: "Documentation", icon: FileText, hasExternal: true },
];

export default function Sidebar() {
  const router = useRouter();
  const {
    activeView,
    setActiveView,
    isSidebarOpen,
    setIsSidebarOpen,
    conversations,
    currentConversation,
    setCurrentConversation,
    setConversations,
    setMessages,
    setPendingRoute,
    ttsEnabled,
    setTtsEnabled,
    ttsVoice,
    setTtsVoice,
    ttsReadCodeBlocks,
    setTtsReadCodeBlocks,
    ttsAutoRead,
    setTtsAutoRead,
  } = useChatStore();

  const [sidebarRenamingId, setSidebarRenamingId] = useState<string | null>(null);
  const [sidebarRenameTitle, setSidebarRenameTitle] = useState("");

  const [historyHover, setHistoryHover] = useState(false);
  const [hoverTimer, setHoverTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const settingsPopoverRef = useRef<HTMLDivElement>(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  const [theme, setTheme] = useState<"dark" | "light" | "system">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("app-theme") as "dark" | "light" | "system") || "dark";
    }
    return "dark";
  });

  const [sendMethod, setSendMethod] = useState<"enter" | "ctrl-enter">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("app-send-method") as "enter" | "ctrl-enter") || "enter";
    }
    return "enter";
  });

  const [autoIndent, setAutoIndent] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("app-auto-indent") !== "false";
    }
    return true;
  });

  const [passwordEnabled, setPasswordEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("app-password-enabled") === "true";
    }
    return false;
  });
  const [passwordHash, setPasswordHash] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("app-password-hash") || "";
    }
    return "";
  });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // TTS voice options
  const ttsVoices = [
    { value: "zh-CN-XiaoxiaoNeural", label: "晓晓 (女)" },
    { value: "zh-CN-YunxiNeural", label: "云希 (男)" },
    { value: "zh-CN-XiaoyiNeural", label: "晓伊 (女)" },
    { value: "zh-CN-YunjianNeural", label: "云健 (男)" },
    { value: "en-US-JennyNeural", label: "Jenny (Female)" },
    { value: "en-US-GuyNeural", label: "Guy (Male)" },
    { value: "en-US-AriaNeural", label: "Aria (Female)" },
    { value: "ja-JP-NanamiNeural", label: "七海 (Female)" },
    { value: "ko-KR-SunHiNeural", label: "선히 (Female)" },
  ];

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    } else {
      root.classList.toggle("dark", theme === "dark");
    }
    localStorage.setItem("app-theme", theme);
    console.log("[Sidebar] Theme applied:", theme, "dark class:", root.classList.contains("dark"));
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("app-send-method", sendMethod);
    console.log("[Sidebar] Send method:", sendMethod);
  }, [sendMethod]);

  useEffect(() => {
    localStorage.setItem("app-auto-indent", String(autoIndent));
    console.log("[Sidebar] Auto-indent:", autoIndent);
  }, [autoIndent]);

  // TTS settings persistence
  useEffect(() => {
    localStorage.setItem("app-tts-enabled", String(ttsEnabled));
    console.log("[Sidebar] TTS enabled:", ttsEnabled);
  }, [ttsEnabled]);

  useEffect(() => {
    localStorage.setItem("app-tts-voice", ttsVoice);
    console.log("[Sidebar] TTS voice:", ttsVoice);
  }, [ttsVoice]);

  useEffect(() => {
    localStorage.setItem("app-tts-read-code", String(ttsReadCodeBlocks));
    console.log("[Sidebar] TTS read code blocks:", ttsReadCodeBlocks);
  }, [ttsReadCodeBlocks]);

  useEffect(() => {
    localStorage.setItem("app-tts-auto-read", String(ttsAutoRead));
    console.log("[Sidebar] TTS auto-read:", ttsAutoRead);
  }, [ttsAutoRead]);

  const simpleHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36) + str.length.toString(36);
  };

  const handleSetPassword = () => {
    setPasswordError("");
    setPasswordSuccess("");
    if (!newPassword.trim()) {
      setPasswordError("Password cannot be empty");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    const hash = simpleHash(newPassword);
    setPasswordHash(hash);
    setPasswordEnabled(true);
    localStorage.setItem("app-password-hash", hash);
    localStorage.setItem("app-password-enabled", "true");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordFields(false);
    setPasswordSuccess("Password set successfully");
    console.log("[Sidebar] Password enabled");
    setTimeout(() => setPasswordSuccess(""), 3000);
  };

  const handleDisablePassword = () => {
    setPasswordEnabled(false);
    setPasswordHash("");
    localStorage.removeItem("app-password-hash");
    localStorage.removeItem("app-password-enabled");
    setShowPasswordFields(false);
    console.log("[Sidebar] Password disabled");
  };



  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsPopoverRef.current && !settingsPopoverRef.current.contains(e.target as Node)) {
        setShowSettingsPopover(false);
      }

    };
    if (showSettingsPopover) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSettingsPopover]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(e.target as Node)) {
        setHistoryHover(false);
      }
    };
    if (historyHover) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [historyHover]);

  const handleHistoryEnter = () => {
    if (hoverTimer) clearTimeout(hoverTimer);
    setHoverTimer(null);
    setHistoryHover(true);
  };

  const handleHistoryLeave = () => {
    const timer = setTimeout(() => setHistoryHover(false), 250);
    setHoverTimer(timer);
  };

  const handleSelectConversation = (conv: Conversation) => {
    if (sidebarRenamingId) return;
    useChatStore.setState({ messageUsage: {} });
    setCurrentConversation(conv);
    setActiveView("playground");
    setHistoryHover(false);
    router.push(`/prompts/${conv.id}`);
  };

  const refreshConversations = async () => {
    const res = await fetch("/api/conversations");
    const data = await res.json();
    if (data.success && data.data) setConversations(data.data);
  };

  const handleSidebarRename = async (convId: string) => {
    if (!sidebarRenameTitle.trim()) {
      setSidebarRenamingId(null);
      return;
    }
    await fetch("/api/conversations/" + convId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: sidebarRenameTitle.trim() }),
    });
    setSidebarRenamingId(null);
    setSidebarRenameTitle("");
    await refreshConversations();
  };

  const handleSidebarDelete = async (convId: string) => {
    await fetch("/api/conversations/" + convId, { method: "DELETE" });
    if (currentConversation?.id === convId) {
      setCurrentConversation(null);
      setMessages([]);
    }
    await refreshConversations();
  };

  const recentConversations = conversations.slice(0, 5);

  return (
    <aside
      className={cn(
        "bg-sidebar border-r border-border flex flex-col h-dvh md:h-screen transition-all duration-300 ease-in-out",
        isSidebarOpen ? "w-[200px] min-w-[200px]" : "w-0 min-w-0 overflow-hidden border-r-0"
      )}
    >
      <div className="px-4 py-4 flex items-center gap-2">
        <img src="/AIStudio.png" alt="AI Studio" className="w-5 h-5 flex-shrink-0" />
        <span className="text-lg font-medium text-foreground">AI Studio</span>
      </div>

      <div className="px-3 mt-2">
        <p className="text-xs font-medium text-muted uppercase tracking-wider px-2 mb-1">
          Explore
        </p>
        {exploreItems.map((item) => (
          <div key={item.id} className="relative" ref={item.id === "history" ? historyRef : undefined}>
            <button
              onClick={() => {
                if (item.id === "history") {
                  setActiveView(item.id);
                  router.push("/library");
                } else if (item.id === "playground") {
                  console.log("[Sidebar] Navigating to playground, clearing conversation and messageUsage. Current pathname:", window.location.pathname);
                  // MUST be first: prevents Store→Route sync from redirecting back during navigation
                  setPendingRoute("/");
                  useChatStore.setState({ messageUsage: {} });
                  setCurrentConversation(null);
                  setMessages([]);
                  setActiveView(item.id);
                  router.push("/");
                  console.log("[Sidebar] router.push('/') called");
                }
              }}
              onMouseEnter={item.id === "history" ? handleHistoryEnter : undefined}
              onMouseLeave={item.id === "history" ? handleHistoryLeave : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150",
                activeView === item.id
                  ? "bg-sidebar-active text-foreground"
                  : "text-muted-foreground hover:bg-surface-variant hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>

            {item.id === "history" && historyHover && recentConversations.length > 0 && (
              <div
                ref={popupRef}
                onMouseEnter={handleHistoryEnter}
                onMouseLeave={handleHistoryLeave}
                className="absolute left-full top-0 ml-2 bg-card border border-border rounded-xl shadow-2xl py-2 w-72 z-50"
              >
                <p className="text-xs font-medium text-muted uppercase tracking-wider px-3 mb-2">
                  Recent
                </p>
                {recentConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={cn(
                      "group/conv flex items-center gap-1 px-3 py-2 transition-colors duration-150 rounded-md",
                      currentConversation?.id === conv.id
                        ? "bg-surface-variant text-foreground"
                        : "text-foreground hover:bg-surface-variant"
                    )}
                  >
                    {sidebarRenamingId === conv.id ? (
                      <div className="flex-1 flex items-center gap-1">
                        <input
                          type="text"
                          value={sidebarRenameTitle}
                          onChange={(e) => setSidebarRenameTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSidebarRename(conv.id);
                            if (e.key === "Escape") { setSidebarRenamingId(null); setSidebarRenameTitle(""); }
                          }}
                          onBlur={() => handleSidebarRename(conv.id)}
                          className="flex-1 bg-transparent text-sm text-foreground border-b border-primary focus:outline-none min-w-0"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSelectConversation(conv)}
                          className="flex-1 text-left min-w-0"
                        >
                          <span className="truncate block text-sm">{conv.title}</span>
                        </button>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover/conv:opacity-100 transition-opacity duration-150 flex-shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSidebarRenamingId(conv.id); setSidebarRenameTitle(conv.title); }}
                            className="p-1 rounded hover:bg-surface-variant text-muted hover:text-foreground transition-colors duration-150"
                            title="Rename"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleSidebarDelete(conv.id); }}
                            className="p-1 rounded hover:bg-surface-variant text-destructive transition-colors duration-150"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="px-3 mt-4">
        <p className="text-xs font-medium text-muted uppercase tracking-wider px-2 mb-1">
          Manage
        </p>
        {manageItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              console.log("[Sidebar] Manage item clicked:", item.id);
              setActiveView(item.id);
              if (item.id === "dashboard") {
                router.push("/dashboard");
              } else if (item.id === "documentation") {
                router.push("/documentation");
              }
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150",
              activeView === item.id
                ? "bg-sidebar-active text-foreground"
                : "text-muted-foreground hover:bg-surface-variant hover:text-foreground"
            )}
          >
            <item.icon className="w-4 h-4" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.hasArrow && <ChevronRight className="w-3 h-3" />}
            {item.hasExternal && <ExternalLink className="w-3 h-3" />}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      <div className="px-3 pb-3" ref={settingsPopoverRef}>
        <button
          onClick={() => setShowSettingsPopover(!showSettingsPopover)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150",
            showSettingsPopover
              ? "bg-sidebar-active text-foreground"
              : "text-muted-foreground hover:bg-surface-variant hover:text-foreground"
          )}
          title="Settings"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>

        {showSettingsPopover && (
          // fixed + high z-index so the popover escapes the sidebar's stacking context
          <div className="fixed bottom-0 left-0 right-0 md:right-auto z-[100]">
            <div className="md:fixed md:bottom-16 md:left-2 md:w-80 bg-card border border-border rounded-t-2xl md:rounded-xl shadow-2xl p-4 max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom-2 fade-in duration-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-foreground">Settings</h3>
                <button
                  onClick={() => setShowSettingsPopover(false)}
                  className="text-muted hover:text-foreground transition-colors"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 mb-4">
                <label className="text-xs font-medium text-muted uppercase tracking-wider">Theme</label>
                <div className="flex gap-1">
                  {([
                    { value: "dark" as const, icon: Moon, label: "Dark" },
                    { value: "light" as const, icon: Sun, label: "Light" },
                    { value: "system" as const, icon: Monitor, label: "System" },
                  ]).map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        theme === value
                          ? "bg-primary text-primary-foreground"
                          : "bg-input text-muted hover:bg-surface-variant"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <label className="text-xs font-medium text-muted uppercase tracking-wider">Send Method</label>
                <div className="flex gap-1">
                  {([
                    { value: "enter" as const, label: "Enter" },
                    { value: "ctrl-enter" as const, label: "Ctrl+Enter" },
                  ]).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setSendMethod(value)}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        sendMethod === value
                          ? "bg-primary text-primary-foreground"
                          : "bg-input text-muted hover:bg-surface-variant"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted">
                  {sendMethod === "enter"
                    ? "Press Enter to send, Shift+Enter for newline"
                    : "Press Ctrl+Enter to send, Enter for newline"}
                </p>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <List className="w-3.5 h-3.5 text-muted" />
                    <label className="text-xs font-medium text-muted uppercase tracking-wider">Auto-Indent Lists</label>
                  </div>
                  <button
                    onClick={() => setAutoIndent(!autoIndent)}
                    className={cn(
                      "relative w-9 h-5 rounded-full transition-colors",
                      autoIndent ? "bg-primary" : "bg-border"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm",
                        autoIndent ? "left-[18px]" : "left-0.5"
                      )}
                    />
                  </button>
                </div>
                <p className="text-[10px] text-muted">
                  Auto-continue numbered or bulleted lists when pressing Enter
                </p>
              </div>

              <div className="space-y-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {passwordEnabled ? <Lock className="w-3.5 h-3.5 text-accent" /> : <Unlock className="w-3.5 h-3.5 text-muted" />}
                    <label className="text-xs font-medium text-muted uppercase tracking-wider">Password Protection</label>
                  </div>
                  <button
                    onClick={() => {
                      if (passwordEnabled) {
                        handleDisablePassword();
                      } else {
                        setShowPasswordFields(!showPasswordFields);
                        setPasswordError("");
                        setPasswordSuccess("");
                      }
                    }}
                    className={cn(
                      "relative w-9 h-5 rounded-full transition-colors",
                      passwordEnabled ? "bg-primary" : "bg-border"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm",
                        passwordEnabled ? "left-[18px]" : "left-0.5"
                      )}
                    />
                  </button>
                </div>

                {passwordEnabled && (
                  <p className="text-[10px] text-accent">Password protection is enabled</p>
                )}

                {showPasswordFields && !passwordEnabled && (
                  <div className="space-y-2">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New password"
                      className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      onKeyDown={(e) => { if (e.key === "Enter") handleSetPassword(); }}
                      className="w-full bg-input border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    {passwordError && <p className="text-[10px] text-destructive">{passwordError}</p>}
                    {passwordSuccess && <p className="text-[10px] text-green-400">{passwordSuccess}</p>}
                    <button
                      onClick={handleSetPassword}
                      className="w-full btn-primary text-xs py-1.5"
                    >
                      Set Password
                    </button>
                  </div>
                )}
              </div>

              {/* Edge-TTS */}
              <div className="space-y-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {ttsEnabled ? <Volume2 className="w-3.5 h-3.5 text-accent" /> : <VolumeX className="w-3.5 h-3.5 text-muted" />}
                    <label className="text-xs font-medium text-muted uppercase tracking-wider">Edge-TTS</label>
                  </div>
                  <button
                    onClick={() => {
                      setTtsEnabled(!ttsEnabled);
                      console.log("[Sidebar] TTS enabled:", !ttsEnabled);
                    }}
                    className={cn(
                      "relative w-9 h-5 rounded-full transition-colors",
                      ttsEnabled ? "bg-primary" : "bg-border"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm",
                        ttsEnabled ? "left-[18px]" : "left-0.5"
                      )}
                    />
                  </button>
                </div>

                {ttsEnabled && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-muted uppercase tracking-wider">Voice</label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowVoiceModal(true);
                          console.log("[Sidebar] Opening voice selection modal");
                        }}
                        className="w-full bg-input border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring flex items-center justify-between gap-1 text-left hover:bg-surface-variant/50 transition-colors"
                      >
                        <span className="truncate">{ttsVoices.find(v => v.value === ttsVoice)?.label || ttsVoice}</span>
                        <ChevronDown className="w-3 h-3 text-muted flex-shrink-0" />
                      </button>
                    </div>
                    {/* Auto-read: AI responses are read aloud after generation completes */}
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-muted">Auto-read responses</label>
                      <button
                        onClick={() => {
                          setTtsAutoRead(!ttsAutoRead);
                          console.log("[Sidebar] TTS auto-read:", !ttsAutoRead);
                        }}
                        className={cn(
                          "relative w-7 h-4 rounded-full transition-colors",
                          ttsAutoRead ? "bg-primary" : "bg-border"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform shadow-sm",
                            ttsAutoRead ? "left-[14px]" : "left-0.5"
                          )}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-muted">Read code blocks</label>
                      <button
                        onClick={() => {
                          setTtsReadCodeBlocks(!ttsReadCodeBlocks);
                          console.log("[Sidebar] TTS read code blocks:", !ttsReadCodeBlocks);
                        }}
                        className={cn(
                          "relative w-7 h-4 rounded-full transition-colors",
                          ttsReadCodeBlocks ? "bg-primary" : "bg-border"
                        )}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform shadow-sm",
                            ttsReadCodeBlocks ? "left-[14px]" : "left-0.5"
                          )}
                        />
                      </button>
                    </div>
                    <p className="text-[10px] text-muted">
                      {ttsAutoRead
                        ? "AI responses are read aloud automatically after generation. Use the \u25B6 icon on any message to replay. Thinking content is always skipped."
                        : "Auto-read is off. Use the \u25B6 icon on any message to read it aloud. Thinking content is always skipped."}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Must stay OUTSIDE the settings popover (overflow clipping) and ABOVE it in z-index */}
      {showVoiceModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowVoiceModal(false);
              console.log("[Sidebar] Voice modal closed (backdrop click)");
            }}
          />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl w-[320px] max-w-[90vw] max-h-[70vh] flex flex-col animate-in zoom-in-95 fade-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-medium text-foreground">Select Voice</h3>
              <button
                onClick={() => setShowVoiceModal(false)}
                className="p-1 rounded-md hover:bg-surface-variant text-muted hover:text-foreground transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {ttsVoices.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => {
                    setTtsVoice(v.value);
                    setShowVoiceModal(false);
                    console.log("[Sidebar] TTS voice selected:", v.value);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between",
                    ttsVoice === v.value
                      ? "bg-primary/10 text-accent font-medium"
                      : "text-foreground hover:bg-surface-variant"
                  )}
                >
                  <span>{v.label}</span>
                  {ttsVoice === v.value && <Check className="w-4 h-4 text-accent" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
