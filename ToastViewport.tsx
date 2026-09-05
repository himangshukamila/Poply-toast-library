import { useContext } from "react";
import { createPortal } from "react-dom";
import { ToastContext } from "./ToastProvider";
import { Toast } from "./Toast";
import type { ToastPosition, ToastRecord } from "./types";

const POSITION_STYLES: Record<ToastPosition, React.CSSProperties> = {
  "top-left": { top: 16, left: 16, alignItems: "flex-start" },
  "top-center": { top: 16, left: "50%", transform: "translateX(-50%)", alignItems: "center" },
  "top-right": { top: 16, right: 16, alignItems: "flex-end" },
  "bottom-left": { bottom: 16, left: 16, alignItems: "flex-start" },
  "bottom-center": {
    bottom: 16,
    left: "50%",
    transform: "translateX(-50%)",
    alignItems: "center",
  },
  "bottom-right": { bottom: 16, right: 16, alignItems: "flex-end" },
};

function groupByPosition(toasts: ToastRecord[]): Record<string, ToastRecord[]> {
  const groups: Record<string, ToastRecord[]> = {};
  for (const t of toasts) {
    (groups[t.position] ??= []).push(t);
  }
  return groups;
}

export function ToastViewport() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("<ToastViewport /> must be rendered within a <ToastProvider>.");
  }

  if (typeof document === "undefined") return null;

  const groups = groupByPosition(ctx.toasts);

  return createPortal(
    <>
      {(Object.keys(groups) as ToastPosition[]).map((position) => {
        const isBottom = position.startsWith("bottom");
        return (
          <div
            key={position}
            style={{
              position: "fixed",
              zIndex: 2147483647,
              display: "flex",
              flexDirection: isBottom ? "column-reverse" : "column",
              gap: `${ctx.gap}px`,
              pointerEvents: "none",
              ...POSITION_STYLES[position],
            }}
          >
            {groups[position].map((t) => (
              <Toast key={t.id} toast={t} onDismiss={ctx.remove} />
            ))}
          </div>
        );
      })}
    </>,
    document.body
  );
}
