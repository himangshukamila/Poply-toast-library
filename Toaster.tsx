import type { ReactNode } from "react";
import type { ToastProviderProps } from "./types";
import { ToastProvider } from "./ToastProvider";
import { ToastViewport } from "./ToastViewport";

export interface ToasterProps extends Omit<ToastProviderProps, "children"> {
  children?: ReactNode;
}

// all-in-one toaster component for drop-in root placement
export function Toaster({
  children,
  defaultPosition = "top-right",
  defaultDuration = 4000,
  defaultProgressBar = false,
  gap = 12,
}: ToasterProps) {
  return (
    <ToastProvider
      defaultPosition={defaultPosition}
      defaultDuration={defaultDuration}
      defaultProgressBar={defaultProgressBar}
      gap={gap}
    >
      {children}
      <ToastViewport />
    </ToastProvider>
  );
}
