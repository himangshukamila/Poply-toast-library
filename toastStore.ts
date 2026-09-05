import type { ReactNode } from "react";
import type { PromiseToastMessages, ToastOptions, ToastVariant } from "./types";

// module-level reference to the mounted ToastProvider's handlers.
// registered on mount via useEffect in ToastProvider, cleared on unmount.
// this is what lets toast.success(...) work from plain js/ts files
// without needing a hook or component context.
interface ToastHandlers {
  add: (message: ReactNode, options?: ToastOptions) => string | number;
  remove: (id: string | number) => void;
  removeAll: () => void;
}

let handlers: ToastHandlers | null = null;
let promiseIdCounter = 0;

export function registerToastHandlers(next: ToastHandlers | null): void {
  handlers = next;
}

function warnNotMounted(): void {
  // eslint-disable-next-line no-console
  console.warn(
    "[poply] toast() was called before a <ToastProvider> mounted. " +
      "Wrap your app in <ToastProvider> to enable toasts."
  );
}

function withVariant(variant: ToastVariant) {
  return (message: ReactNode, options: ToastOptions = {}) => {
    if (!handlers) {
      warnNotMounted();
      return "";
    }
    return handlers.add(message, { ...options, variant });
  };
}

function handlePromise<T>(
  promise: Promise<T>,
  messages: PromiseToastMessages<T>,
  options: ToastOptions = {}
): Promise<T> {
  if (!handlers) {
    warnNotMounted();
    return promise;
  }

  promiseIdCounter += 1;
  const id = options.id ?? `promise-${Date.now()}-${promiseIdCounter}`;

  // trigger initial loading toast with infinite duration
  handlers.add(messages.loading, {
    ...options,
    id,
    variant: "loading",
    duration: Infinity,
  });

  promise
    .then((data) => {
      const message =
        typeof messages.success === "function"
          ? messages.success(data)
          : messages.success;
      handlers?.add(message, {
        ...options,
        id,
        variant: "success",
        duration: options.duration ?? 4000,
      });
    })
    .catch((err) => {
      const message =
        typeof messages.error === "function"
          ? messages.error(err)
          : messages.error;
      handlers?.add(message, {
        ...options,
        id,
        variant: "error",
        duration: options.duration ?? 4000,
      });
    });

  return promise;
}

export const toast = {
  show: withVariant("default"),
  success: withVariant("success"),
  error: withVariant("error"),
  info: withVariant("info"),
  warning: withVariant("warning"),
  loading: (message: ReactNode, options: ToastOptions = {}) =>
    withVariant("loading")(message, { duration: Infinity, ...options }),
  promise: handlePromise,
  dismiss: (id: string | number) => handlers?.remove(id),
  dismissAll: () => handlers?.removeAll(),
};
