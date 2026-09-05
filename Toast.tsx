import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode, CSSProperties } from "react";
import type { ToastRecord, ToastVariant } from "./types";
import { resolveToastStyle } from "./resolveStyle";
import { sanitizeColor } from "./sanitize";
import { TOAST_EXIT_DURATION_MS } from "./ToastProvider";

interface ToastProps {
  toast: ToastRecord;
  onDismiss: (id: string | number) => void;
}

const VARIANT_ACCENTS: Record<ToastVariant, { color: string; background: string }> = {
  default: { color: "#94a3b8", background: "#18181b" },
  success: { color: "#10b981", background: "#18181b" },
  error: { color: "#ef4444", background: "#18181b" },
  info: { color: "#3b82f6", background: "#18181b" },
  warning: { color: "#f59e0b", background: "#18181b" },
  loading: { color: "#a1a1aa", background: "#18181b" },
};

// renders clean inline svg icons without any external runtime dependencies
function renderToastIcon(variant: ToastVariant, customIcon?: ReactNode): ReactNode {
  if (customIcon) {
    return <span style={{ display: "flex", flexShrink: 0 }}>{customIcon}</span>;
  }

  const strokeWidth = 2;
  const size = 18;

  switch (variant) {
    case "success":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#10b981"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      );
    case "error":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ef4444"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      );
    case "warning":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#f59e0b"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      );
    case "info":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#3b82f6"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      );
    case "loading":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#a1a1aa"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 12 12"
            to="360 12 12"
            dur="1s"
            repeatCount="indefinite"
          />
        </svg>
      );
    default:
      return null;
  }
}

// toast component with popover styling, pause-on-hover timer and progress bar.
// this component owns the auto-dismiss countdown: it is the only place that
// knows whether the user is currently hovering or focusing the toast.
export function Toast({ toast, onDismiss }: ToastProps) {
  const { id, duration, createdAt, isLeaving } = toast;

  const [remaining, setRemaining] = useState(duration);
  const [paused, setPaused] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const startRef = useRef<number>(Date.now());
  // mirrors `paused` for the event handlers, which must not read stale state
  // and must never subtract the same elapsed slice twice
  const pausedRef = useRef(false);

  const isTimed = Number.isFinite(duration);
  const showProgress = toast.progressBar === true && isTimed;

  // a toast can be replaced in place (same id, e.g. toast.promise going from
  // loading to success). react keeps the same component instance, so the
  // countdown has to be reset explicitly: otherwise the replacement inherits
  // the previous remaining time and, if that was Infinity, never dismisses.
  useEffect(() => {
    startRef.current = Date.now();
    pausedRef.current = false;
    setRemaining(duration);
    setPaused(false);
    setProgressPercent(0);
  }, [duration, createdAt]);

  // handles auto-dismiss timeout and pause-on-hover resumption
  useEffect(() => {
    if (paused || isLeaving) return;
    if (!Number.isFinite(remaining)) return;

    startRef.current = Date.now();
    const timeout = setTimeout(() => onDismiss(id), Math.max(remaining, 0));

    return () => clearTimeout(timeout);
    // createdAt is a dependency so that replacing a toast in place restarts the
    // countdown even when the new record happens to have the same duration
  }, [paused, remaining, isLeaving, id, createdAt, onDismiss]);

  // synchronizes progress bar animation with hover pauses
  useEffect(() => {
    if (!showProgress || !Number.isFinite(remaining) || duration <= 0) return;

    if (paused) {
      // `remaining` was already reduced by the elapsed slice when the pause
      // started, so the consumed fraction follows directly from it. recomputing
      // the elapsed time here would count that slice a second time and make the
      // bar jump forward on hover.
      const consumed = ((duration - remaining) / duration) * 100;
      setProgressPercent(Math.min(Math.max(consumed, 0), 100));
      return;
    }

    // animate from the current percentage to 100 percent over the remaining time
    const frameId = requestAnimationFrame(() => setProgressPercent(100));
    return () => cancelAnimationFrame(frameId);
  }, [paused, remaining, duration, showProgress]);

  const pause = useCallback(() => {
    if (!Number.isFinite(duration) || pausedRef.current) return;
    pausedRef.current = true;
    const elapsed = Date.now() - startRef.current;
    setRemaining((prev) => Math.max(prev - elapsed, 0));
    setPaused(true);
  }, [duration]);

  const resume = useCallback(() => {
    if (!pausedRef.current) return;
    pausedRef.current = false;
    setPaused(false);
  }, []);

  const accent = VARIANT_ACCENTS[toast.variant] ?? VARIANT_ACCENTS.default;
  const resolvedStyle = resolveToastStyle(toast);

  const containerStyle: CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    minWidth: "280px",
    maxWidth: "420px",
    backgroundColor: accent.background,
    color: "#f4f4f5",
    padding: "14px 16px",
    borderRadius: "14px",
    border: "1px solid #27272a",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.4)",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: "14px",
    lineHeight: 1.4,
    pointerEvents: "auto",
    position: "relative",
    overflow: "hidden",
    boxSizing: "border-box",
    transition: `transform ${TOAST_EXIT_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${TOAST_EXIT_DURATION_MS}ms ease`,
    opacity: isLeaving ? 0 : 1,
    transform: isLeaving ? "scale(0.95) translateY(6px)" : "scale(1) translateY(0)",
    ...resolvedStyle,
  };

  const progressColor = sanitizeColor(toast.progressColor).value ?? accent.color;

  return (
    <div
      role={toast.variant === "error" ? "alert" : "status"}
      aria-live={toast.variant === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      style={containerStyle}
      onMouseEnter={pause}
      onMouseLeave={resume}
      // keyboard users never fire mouse events: focusing the dismiss button
      // has to pause the countdown too, or the toast disappears mid-tab
      onFocus={pause}
      onBlur={resume}
    >
      {renderToastIcon(toast.variant, toast.icon)}

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "3px" }}>
        <div style={{ fontWeight: 600, fontSize: "14px", color: "#f4f4f5", wordBreak: "break-word" }}>
          {toast.message}
        </div>
        {toast.description && (
          <div style={{ fontSize: "13px", color: "#a1a1aa", lineHeight: 1.35, wordBreak: "break-word" }}>
            {toast.description}
          </div>
        )}
      </div>

      {toast.closable && (
        <button
          type="button"
          onClick={() => onDismiss(id)}
          aria-label="Dismiss notification"
          style={{
            background: "transparent",
            border: "none",
            color: "#a1a1aa",
            cursor: "pointer",
            fontSize: "18px",
            lineHeight: 1,
            padding: "2px",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "color 150ms ease",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}

      {showProgress && (
        <div
          data-testid="ztoast-progress-track"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "rgba(255, 255, 255, 0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${progressPercent}%`,
              background: progressColor,
              transition: paused ? "none" : `width ${Math.max(remaining, 0)}ms linear`,
            }}
          />
        </div>
      )}
    </div>
  );
}
