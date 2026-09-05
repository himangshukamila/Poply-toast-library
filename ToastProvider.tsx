import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type {
  ToastOptions,
  ToastProviderProps,
  ToastRecord,
  ToastPosition,
  ToastOffsetOptions,
} from "./types";
import { registerToastHandlers } from "./toastStore";

export interface ToastContextValue {
  toasts: ToastRecord[];
  add: (message: ReactNode, options?: ToastOptions) => string | number;
  remove: (id: string | number) => void;
  removeAll: () => void;
  gap: number;
  defaultPosition: ToastPosition;
  offset?: ToastOffsetOptions;
  top?: number | string;
  bottom?: number | string;
  left?: number | string;
  right?: number | string;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

let localIdCounter = 0;
function generateId(): string {
  localIdCounter += 1;
  return `ztoast-${Date.now()}-${localIdCounter}`;
}

export function ToastProvider({
  children,
  defaultPosition = "top-right",
  defaultDuration = 4000,
  defaultProgressBar = false,
  gap = 12,
  offset,
  top,
  bottom,
  left,
  right,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timers = useRef<Map<string | number, ReturnType<typeof setTimeout>>>(new Map());
  const exitTimers = useRef<Map<string | number, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = useCallback((id: string | number) => {
    const t = timers.current.get(id);
    if (t) {
      clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const remove = useCallback(
    (id: string | number) => {
      clearTimer(id);

      // mark as leaving first to allow exit transition to play
      setToasts((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            t.onClose?.();
            return { ...t, isLeaving: true };
          }
          return t;
        })
      );

      // clean up any preexisting exit timer for this id
      const existingExit = exitTimers.current.get(id);
      if (existingExit) clearTimeout(existingExit);

      // remove from array after exit transition finishes
      const exitTimer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        exitTimers.current.delete(id);
      }, 200);
      exitTimers.current.set(id, exitTimer);
    },
    [clearTimer]
  );

  const removeAll = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current.clear();
    exitTimers.current.forEach((t) => clearTimeout(t));
    exitTimers.current.clear();
    setToasts([]);
  }, []);

  const add = useCallback(
    (message: ReactNode, options: ToastOptions = {}) => {
      const id = options.id ?? generateId();
      const duration = options.duration ?? defaultDuration;
      const progressBar = options.progressBar ?? defaultProgressBar;

      const record: ToastRecord = {
        id,
        message,
        description: options.description,
        variant: options.variant ?? "default",
        position: options.position ?? defaultPosition,
        duration,
        closable: options.closable ?? true,
        progressBar,
        isLeaving: false,
        icon: options.icon,
        onClose: options.onClose,
        offset: options.offset,
        top: options.top,
        bottom: options.bottom,
        left: options.left,
        right: options.right,
        transform: options.transform,
        width: options.width,
        height: options.height,
        background: options.background,
        backgroundGradient: options.backgroundGradient,
        backgroundImage: options.backgroundImage,
        textColor: options.textColor,
        fontFamily: options.fontFamily,
        fontSize: options.fontSize,
        fontWeight: options.fontWeight,
        border: options.border,
        borderColor: options.borderColor,
        borderWidth: options.borderWidth,
        borderRadius: options.borderRadius,
        boxShadow: options.boxShadow,
        padding: options.padding,
        progressColor: options.progressColor,
        createdAt: Date.now(),
      };

      setToasts((prev) => {
        // replace an existing toast with the same id instead of duplicating
        const withoutExisting = prev.filter((t) => t.id !== id);
        return [...withoutExisting, record];
      });

      clearTimer(id);
      if (duration !== Infinity) {
        const timer = setTimeout(() => remove(id), duration);
        timers.current.set(id, timer);
      }

      return id;
    },
    [defaultDuration, defaultPosition, defaultProgressBar, clearTimer, remove]
  );

  useEffect(() => {
    registerToastHandlers({ add, remove, removeAll });
    return () => {
      registerToastHandlers(null);
      timers.current.forEach((t) => clearTimeout(t));
      timers.current.clear();
      exitTimers.current.forEach((t) => clearTimeout(t));
      exitTimers.current.clear();
    };
  }, [add, remove, removeAll]);

  const value = useMemo(
    () => ({
      toasts,
      add,
      remove,
      removeAll,
      gap,
      defaultPosition,
      offset,
      top,
      bottom,
      left,
      right,
    }),
    [toasts, add, remove, removeAll, gap, defaultPosition, offset, top, bottom, left, right]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
