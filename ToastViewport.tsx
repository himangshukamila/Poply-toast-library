import { useContext, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ToastContext, type ToastContextValue } from "./ToastProvider";
import { Toast } from "./Toast";
import type { ToastPosition, ToastRecord } from "./types";
import { sanitizeDimension, sanitizeTransform } from "./sanitize";

interface ResolvedViewportGroup {
  key: string;
  isBottom: boolean;
  style: CSSProperties;
  toasts: ToastRecord[];
}

// distance from the viewport edge when no explicit coordinate is supplied
const DEFAULT_EDGE_OFFSET = 16;

const KNOWN_POSITIONS = new Set<string>([
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
]);

function resolvePosition(
  candidate: ToastPosition | undefined,
  fallback: ToastPosition | undefined
): ToastPosition {
  if (candidate && KNOWN_POSITIONS.has(candidate)) return candidate;
  if (fallback && KNOWN_POSITIONS.has(fallback)) return fallback;
  return "top-right";
}

function firstDefined(
  values: Array<number | string | undefined>
): number | string | undefined {
  for (const value of values) {
    if (value !== undefined) return value;
  }
  return undefined;
}

// computes the viewport container style and grouping key for a given toast
function computeViewportStyle(
  toast: ToastRecord,
  ctx: ToastContextValue
): { key: string; isBottom: boolean; style: CSSProperties } {
  const position = resolvePosition(toast.position, ctx.defaultPosition);
  const isBottom = position.startsWith("bottom");
  const isCenter = position.endsWith("center");
  const isRightAnchored = position.endsWith("right");

  // the shorthand axes (offset.x / offset.y) only feed the edge the position is
  // actually anchored to; applying them to both edges would stretch the
  // container across the screen and break the alignment.
  const rawTop = firstDefined([
    toast.top,
    toast.offset?.top,
    isBottom ? undefined : toast.offset?.y,
    ctx.top,
    ctx.offset?.top,
    isBottom ? undefined : ctx.offset?.y,
  ]);
  const rawBottom = firstDefined([
    toast.bottom,
    toast.offset?.bottom,
    isBottom ? toast.offset?.y : undefined,
    ctx.bottom,
    ctx.offset?.bottom,
    isBottom ? ctx.offset?.y : undefined,
  ]);
  const rawLeft = firstDefined([
    toast.left,
    toast.offset?.left,
    isRightAnchored ? undefined : toast.offset?.x,
    ctx.left,
    ctx.offset?.left,
    isRightAnchored ? undefined : ctx.offset?.x,
  ]);
  const rawRight = firstDefined([
    toast.right,
    toast.offset?.right,
    isRightAnchored ? toast.offset?.x : undefined,
    ctx.right,
    ctx.offset?.right,
    isRightAnchored ? ctx.offset?.x : undefined,
  ]);

  // every coordinate the consumer supplied is a raw css value: sanitize before use
  const top = sanitizeDimension(rawTop).value;
  const bottom = sanitizeDimension(rawBottom).value;
  const left = sanitizeDimension(rawLeft).value;
  const right = sanitizeDimension(rawRight).value;
  const transform = sanitizeTransform(toast.transform).value;

  const gap = Number.isFinite(ctx.gap) ? ctx.gap : 12;

  const style: CSSProperties = {
    position: "fixed",
    zIndex: 2147483647,
    display: "flex",
    flexDirection: isBottom ? "column-reverse" : "column",
    gap: `${gap}px`,
    pointerEvents: "none",
  };

  // vertical axis: only fall back to the default edge inset when the opposite
  // edge was not pinned explicitly, otherwise the container spans the screen
  if (isBottom) {
    style.bottom = bottom ?? DEFAULT_EDGE_OFFSET;
    if (top !== undefined) style.top = top;
  } else {
    if (top !== undefined || bottom === undefined) {
      style.top = top ?? DEFAULT_EDGE_OFFSET;
    }
    if (bottom !== undefined) style.bottom = bottom;
  }

  // horizontal axis
  if (isCenter) {
    style.left = left ?? "50%";
    if (right !== undefined) style.right = right;
    style.alignItems = "center";
    // an explicit left coordinate means the consumer is placing the container
    // themselves, so the automatic centering shift is not applied
    style.transform = transform ?? (left !== undefined ? undefined : "translateX(-50%)");
  } else if (isRightAnchored) {
    style.right = right ?? DEFAULT_EDGE_OFFSET;
    if (left !== undefined) style.left = left;
    style.alignItems = "flex-end";
    if (transform) style.transform = transform;
  } else {
    style.left = left ?? DEFAULT_EDGE_OFFSET;
    if (right !== undefined) style.right = right;
    style.alignItems = "flex-start";
    if (transform) style.transform = transform;
  }

  const key = `${position}__t:${String(style.top)}__b:${String(style.bottom)}__l:${String(
    style.left
  )}__r:${String(style.right)}__tr:${String(style.transform)}`;

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
  // portals cannot be rendered during server rendering or the first hydration
  // pass: the markup would not match what the server produced. mounting on the
  // client only keeps SSR frameworks (next.js app router, remix) hydration-safe.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const groups = useMemo(() => (ctx ? groupToasts(ctx.toasts, ctx) : []), [ctx]);

  if (!ctx) {
    throw new Error("<ToastViewport /> must be rendered within a <ToastProvider>.");
  }

  if (!mounted || typeof document === "undefined" || !document.body) return null;

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
