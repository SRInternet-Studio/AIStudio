"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small reusable confirmation dialog for destructive actions (delete
 * conversation, "Delete from here", …) so a misclick can never wipe chat
 * history.
 *
 * Rendered through a portal into document.body ON PURPOSE:
 *  - MessageActions (one of the callers) lives inside a hover-reveal wrapper
 *    (`opacity-0 group-hover/msg:opacity-100`). Inlining the dialog there
 *    made it inherit opacity-0 the moment the hover state cleared — which on
 *    touch devices happens right after the tap, so the dialog appeared for a
 *    split second and "vanished" (it was still mounted, just invisible).
 *  - A portal also escapes any ancestor transform/overflow stacking context,
 *    so `fixed` positioning and the z-index are resolved against the
 *    viewport and the dialog is guaranteed to be the topmost layer.
 * z-[180] sits above every app dialog (z-50), run-settings overlays and the
 * notice toast (z-[150]); only the lock screen (z-[200]) ranks higher.
 */
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Move focus into the dialog as soon as it opens so keyboard/touch input
  // targets the dialog instead of whatever was under the finger before.
  useEffect(() => {
    if (open) {
      // Defer one frame: the portal node must exist before focusing.
      const t = requestAnimationFrame(() => cancelRef.current?.focus());
      return () => cancelAnimationFrame(t);
    }
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[180] flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in scale-in duration-150">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            {title}
          </h3>
          <button onClick={onCancel} className="text-muted hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-muted mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-foreground hover:bg-surface-variant transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors",
              "text-destructive bg-destructive/10 hover:bg-destructive/20"
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
