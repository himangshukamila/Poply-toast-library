import { useContext } from "react";
import { createPortal } from "react-dom";
import { ToastContext, type ToastContextValue } from "./ToastProvider";
import { Toast } from "./Toast";
import type { ToastRecord } from "./types";
import { sanitizeDimension, sanitizeTransform } from "./sanitize";

interface ResolvedViewportGroup {
  key: string;
  isBottom: boolean;
  style: React.CSSProperties;
  toasts: ToastRecord[];
}

// computes the viewport container style and grouping key for a given toast
function computeViewportStyle(
  toast: ToastRecord,
  ctx: ToastContextValue
): { key: string; isBottom: boolean; style: React.CSSProperties } {
  const position = toast.position || ctx.defaultPosition || "top-right";
  const isBottom = position.startsWith("bottom");

  const rawTop = toast.top ?? toast.offset?.top ?? toast.offset?.y ?? ctx.top ?? ctx.offset?.top ?? ctx.offset?.y;
  const rawBottom =
    toast.bottom ?? toast.offset?.bottom ?? toast.offset?.y ?? ctx.bottom ?? ctx.offset?.bottom ?? ctx.offset?.y;
  const rawLeft =
    toast.left ?? toast.offset?.left ?? toast.offset?.x ?? ctx.left ?? ctx.offset?.left ?? ctx.offset?.x;
  const rawRight =
    toast.right ?? toast.offset?.right ?? toast.offset?.x ?? ctx.right ?? ctx.offset?.right ?? ctx.offset?.x;
  const rawTransform = toast.transform;

  const top = sanitizeDimension(rawTop).value;
  const bottom = sanitizeDimension(rawBottom).value;
  const left = sanitizeDimension(rawLeft).value;
  const right = sanitizeDimension(rawRight).value;
  const transform = sanitizeTransform(rawTransform).value;

  const style: React.CSSProperties = {
    position: "fixed",
    zIndex: 2147483647,
    display: "flex",
    flexDirection: isBottom ? "column-reverse" : "column",
    gap: `${ctx.gap}px`,
    pointerEvents: "none",
  };

  switch (position) {
    case "top-left":
      style.top = top ?? 16;
      style.left = left ?? 16;
      style.alignItems = "flex-start";
      if (transform) style.transform = transform;
      break;
    case "top-center":
      style.top = top ?? 16;
      style.left = left ?? "50%";
      style.transform = transform ?? (left ? undefined : "translateX(-50%)");
      style.alignItems = "center";
      break;
    case "top-right":
      style.top = top ?? 16;
      style.right = right ?? 16;
      style.alignItems = "flex-end";
      if (transform) style.transform = transform;
      break;
    case "bottom-left":
      style.bottom = bottom ?? 16;
      style.left = left ?? 16;
      style.alignItems = "flex-start";
      if (transform) style.transform = transform;
      break;
    case "bottom-center":
      style.bottom = bottom ?? 16;
      style.left = left ?? "50%";
      style.transform = transform ?? (left ? undefined : "translateX(-50%)");
      style.alignItems = "center";
      break;
    case "bottom-right":
      style.bottom = bottom ?? 16;
      style.right = right ?? 16;
      style.alignItems = "flex-end";
      if (transform) style.transform = transform;
      break;
    default:
      style.top = top ?? 16;
      style.right = right ?? 16;
      style.alignItems = "flex-end";
      if (transform) style.transform = transform;
      break;
  }

  // override with explicit bottom or right if directly provided
  if (bottom !== undefined && !position.startsWith("bottom")) {
    style.bottom = bottom;
  }
  if (right !== undefined && !position.endsWith("right")) {
    style.right = right;
  }

  const key = `${position}__t:${String(style.top)}__b:${String(style.bottom)}__l:${String(style.left)}__r:${String(
    style.right
  )}__tr:${String(style.transform)}`;

  return { key, isBottom, style };
}

function groupToasts(
  toasts: ToastRecord[],
  ctx: ToastContextValue
): ResolvedViewportGroup[] {
  const map = new Map<string, ResolvedViewportGroup>();

  for (const toast of toasts) {
    const { key, isBottom, style } = computeViewportStyle(toast, ctx);
    const existing = map.get(key);
    if (existing) {
      existing.toasts.push(toast);
    } else {
      map.set(key, { key, isBottom, style, toasts: [toast] });
    }
  }

  return Array.from(map.values());
}

export function ToastViewport() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("<ToastViewport /> must be rendered within a <ToastProvider>.");
  }

  if (typeof document === "undefined") return null;

  const groups = groupToasts(ctx.toasts, ctx);

  return createPortal(
    <>
      {groups.map((group) => (
        <div key={group.key} style={group.style}>
          {group.toasts.map((t) => (
            <Toast key={t.id} toast={t} onDismiss={ctx.remove} />
          ))}
        </div>
      ))}
    </>,
    document.body
  );
}
