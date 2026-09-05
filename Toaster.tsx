import type { ReactNode } from "react";
import type { ToastProviderProps } from "./types";
import { ToastProvider } from "./ToastProvider";
import { ToastViewport } from "./ToastViewport";

export interface ToasterProps extends Omit<ToastProviderProps, "children"> {
  children?: ReactNode;
}

// all-in-one toaster component for drop-in root placement.
// every prop is forwarded untouched so the defaults live in exactly one place
// (<ToastProvider />) and cannot drift between the two entry points.
export function Toaster({ children, ...providerProps }: ToasterProps) {
  return (
    <ToastProvider {...providerProps}>
      {children}
      <ToastViewport />
    </ToastProvider>
  );
}
