import type { ReactNode } from "react";

// the 6 anchor positions a toast viewport can be placed at
export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type ToastVariant =
  | "default"
  | "success"
  | "error"
  | "info"
  | "warning"
  | "loading";

// custom coordinate offset options for viewports and toasts
export interface ToastOffsetOptions {
  top?: number | string;
  bottom?: number | string;
  left?: number | string;
  right?: number | string;
  x?: number | string;
  y?: number | string;
}

// every visual customization option exposed to the consumer.
// all of these end up resolved into a single inline style object,
// after passing through the sanitizer for any raw css-value strings.
export interface ToastStyleOptions {
  width?: number | string;
  height?: number | string;
  background?: string;
  backgroundGradient?: string;
  backgroundImage?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number | string;
  fontWeight?: number | string;
  border?: string;
  borderColor?: string;
  borderWidth?: number | string;
  borderRadius?: number | string;
  boxShadow?: string;
  padding?: number | string;
  progressColor?: string;
  top?: number | string;
  bottom?: number | string;
  left?: number | string;
  right?: number | string;
  transform?: string;
}

export interface ToastOptions extends ToastStyleOptions {
  id?: string | number;
  variant?: ToastVariant;
  position?: ToastPosition;
  offset?: ToastOffsetOptions;
  duration?: number; // ms; use infinity to persist until closed manually
  closable?: boolean; // show the dismiss button, default true
  progressBar?: boolean; // show the animated progress countdown bar, default false
  description?: ReactNode; // secondary description line below the title
  icon?: ReactNode;
  onClose?: () => void;
}

export interface ToastRecord
  extends Required<
      Pick<ToastOptions, "id" | "variant" | "position" | "duration" | "closable">
    >,
    ToastStyleOptions {
  message: ReactNode;
  description?: ReactNode;
  progressBar?: boolean;
  offset?: ToastOffsetOptions;
  isLeaving?: boolean;
  icon?: ReactNode;
  onClose?: () => void;
  createdAt: number;
}

export interface ToastProviderProps {
  children: ReactNode;
  defaultPosition?: ToastPosition;
  defaultDuration?: number;
  defaultProgressBar?: boolean;
  gap?: number; // px gap between stacked toasts
  offset?: ToastOffsetOptions;
  top?: number | string;
  bottom?: number | string;
  left?: number | string;
  right?: number | string;
}

export interface PromiseToastMessages<T> {
  loading: ReactNode;
  success: ReactNode | ((data: T) => ReactNode);
  error: ReactNode | ((err: unknown) => ReactNode);
}

