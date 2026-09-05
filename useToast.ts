import { useContext } from "react";
import { ToastContext } from "./ToastProvider";

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast() must be called within a <ToastProvider>.");
  }
  return {
    toasts: ctx.toasts,
    show: ctx.add,
    dismiss: ctx.remove,
    dismissAll: ctx.removeAll,
  };
}
