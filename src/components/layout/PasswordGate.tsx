"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Lock, Eye, EyeOff, AlertTriangle, X, Trash2 } from "lucide-react";

// Simple hash function (same as in Sidebar)
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + str.length.toString(36);
};

interface PasswordGateProps {
  children: React.ReactNode;
}

// Custom confirmation modal
function ConfirmModal({
  title,
  message,
  confirmText,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in scale-in duration-150">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-foreground">{title}</h3>
          <button onClick={onCancel} className="text-muted hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-foreground hover:bg-surface-variant transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Text input confirmation modal (for "DELETE ALL" step)
function TextInputModal({
  title,
  message,
  requiredText,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  requiredText: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [input, setInput] = useState("");

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in scale-in duration-150">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-foreground">{title}</h3>
          <button onClick={onCancel} className="text-muted hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted mb-4">{message}</p>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input === requiredText) onConfirm();
            if (e.key === "Escape") onCancel();
          }}
          placeholder={`Type "${requiredText}" to confirm`}
          autoFocus
          className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-ring mb-4"
        />
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-foreground hover:bg-surface-variant transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={input !== requiredText}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PasswordGate({ children }: PasswordGateProps) {
  // Start with checking=true to match server render (prevents hydration mismatch)
  const [isLocked, setIsLocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const hasCheckedRef = useRef(false);

  // Clear data confirmation flow state
  const [clearStep, setClearStep] = useState<0 | 1 | 2 | 3>(0);
  // 0 = no modal, 1 = first confirm, 2 = second confirm, 3 = text input

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const enabled = localStorage.getItem("app-password-enabled") === "true";
    const hash = localStorage.getItem("app-password-hash") || "";
    console.log("[PasswordGate] Check: enabled=", enabled, "hash=", !!hash);

    // Check for hard refresh - clear session unlock state
    try {
      const navEntries = performance.getEntriesByType("navigation");
      if (navEntries.length > 0 && (navEntries[0] as PerformanceNavigationTiming).type === "reload") {
        console.log("[PasswordGate] Hard refresh detected, clearing session unlock state");
        sessionStorage.removeItem("app-password-unlocked");
      }
    } catch (e) { /* ignore */ }

    const sessionUnlocked = sessionStorage.getItem("app-password-unlocked") === "true";
    console.log("[PasswordGate] sessionUnlocked=", sessionUnlocked);

    if (enabled && hash && !sessionUnlocked) {
      console.log("[PasswordGate] Locking - password required");
      setIsLocked(true);
    } else {
      setIsLocked(false);
    }
    setChecking(false);
  }, []);

  const handleUnlock = () => {
    setError("");
    const storedHash = localStorage.getItem("app-password-hash") || "";
    const inputHash = simpleHash(password);
    console.log("[PasswordGate] Attempting unlock...");

    if (inputHash === storedHash) {
      console.log("[PasswordGate] Password correct, unlocking");
      setIsLocked(false);
      setPassword("");
      setWrongAttempts(0);
      // Mark as unlocked in this session
      sessionStorage.setItem("app-password-unlocked", "true");
    } else {
      console.log("[PasswordGate] Password incorrect, attempt:", wrongAttempts + 1);
      setError("Incorrect password. Please try again.");
      setWrongAttempts((prev) => prev + 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleUnlock();
    }
  };

  // Clear all data logic - uses the comprehensive /api/clear-all endpoint
  const executeClearAll = useCallback(async () => {
    console.log("[PasswordGate] Executing clear all data...");
    try {
      // Call the comprehensive clear-all API endpoint
      const clearRes = await fetch("/api/clear-all", { method: "POST" });
      const clearData = await clearRes.json();
      
      if (!clearData.success) {
        console.error("[PasswordGate] Clear-all API failed:", clearData.error);
        throw new Error(clearData.error || "Failed to clear data");
      }
      
      console.log("[PasswordGate] Clear-all API succeeded");
      
      // Clear password from localStorage
      localStorage.removeItem("app-password-hash");
      localStorage.removeItem("app-password-enabled");
      sessionStorage.removeItem("app-password-unlocked");
      
      console.log("[PasswordGate] All data cleared, reloading...");
      window.location.reload();
    } catch (err) {
      console.error("[PasswordGate] Failed to clear data:", err);
    }
  }, []);

  // Still checking localStorage - show nothing
  if (checking) {
    return null;
  }

  // Not locked - render children normally
  if (!isLocked) {
    return <>{children}</>;
  }

  // Locked - show password gate
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-medium text-foreground mb-1">AI Studio</h1>
          <p className="text-sm text-muted">Enter password to access</p>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Password"
              autoFocus
              className="w-full bg-input border border-border rounded-xl px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <button
            onClick={handleUnlock}
            disabled={!password.trim()}
            className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Unlock
          </button>

          {/* Clear Password & Delete All History - only shown after at least 1 wrong attempt */}
          {wrongAttempts >= 1 && (
            <button
              onClick={() => setClearStep(1)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Clear Password &amp; Delete All History
            </button>
          )}
        </div>
      </div>

      {/* 3-layer confirmation modals */}
      {clearStep === 1 && (
        <ConfirmModal
          title="Clear Password & Delete All History"
          message="Are you sure you want to clear the password and delete all history? This action cannot be undone."
          confirmText="Yes, Continue"
          onConfirm={() => setClearStep(2)}
          onCancel={() => setClearStep(0)}
        />
      )}

      {clearStep === 2 && (
        <ConfirmModal
          title="Final Warning"
          message="Really sure? All conversations, messages and attachments will be permanently deleted!"
          confirmText="Yes, Delete Everything"
          onConfirm={() => setClearStep(3)}
          onCancel={() => setClearStep(0)}
        />
      )}

      {clearStep === 3 && (
        <TextInputModal
          title="Confirm Deletion"
          message='Please type "DELETE ALL" below to confirm that you want to permanently delete all data.'
          requiredText="DELETE ALL"
          onConfirm={executeClearAll}
          onCancel={() => setClearStep(0)}
        />
      )}
    </div>
  );
}
