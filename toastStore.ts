import type { ReactNode } from "react";
import type { PromiseToastMessages, ToastOptions, ToastVariant } from "./types";

// module-level reference to the mounted ToastProvider's handlers.
// registered on mount via useEffect in ToastProvider, cleared on unmount.
// this is what lets toast.success(...) work from plain js/ts files
// without needing a hook or component context.
export interface ToastHandlers {
  add: (message: ReactNode, options?: ToastOptions) => string | number;
  remove: (id: string | number) => void;
  removeAll: () => void;
}

let handlers: ToastHandlers | null = null;
let promiseIdCounter = 0;
let warnedNotMounted = false;

export function registerToastHandlers(next: ToastHandlers): void {
  handlers = next;
}

// only clears the slot if it still points at the caller's own handlers.
// without this, unmounting a second provider would silently disable the first.
export function unregisterToastHandlers(previous: ToastHandlers): void {
  if (handlers === previous) handlers = null;
}

// bundlers cannot statically replace this, so it is read defensively: any
// runtime without `process` (browsers, workers) is treated as development.
function isProduction(): boolean {
  const env = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env;
  return env?.NODE_ENV === "production";
}

// diagnostics are development-only so a production bundle never logs from a library
export function devWarn(message: string): void {
  if (isProduction()) return;
  // eslint-disable-next-line no-console
  console.warn(`[ztoast] ${message}`);
}

function warnNotMounted(): void {
  // warn once: a misconfigured app would otherwise flood the console
  if (warnedNotMounted) return;
  warnedNotMounted = true;
  devWarn(
    "toast() was called before a <ToastProvider> mounted. " +
      "Render <Toaster /> (or <ToastProvider> + <ToastViewport />) at the root of your app."
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

// resolves a static or callback message without letting a throwing consumer
// callback break the promise chain the caller is still awaiting.
function resolveMessage<T>(
  message: ReactNode | ((value: T) => ReactNode),
  value: T
): ReactNode {
  if (typeof message !== "function") return message;
  try {
    return (message as (value: T) => ReactNode)(value);
  } catch (error) {
    devWarn(`toast.promise message callback threw: ${String(error)}`);
    return null;
  }
}

function handlePromise<T>(
  promise: Promise<T>,
  messages: PromiseToastMessages<T>,
  options: ToastOptions = {}
): Promise<T> {
  if (!promise || typeof promise.then !== "function") {
    devWarn("toast.promise() expects a promise as its first argument.");
    return promise;
  }

  if (!handlers) {
    warnNotMounted();
    return promise;
  }

  promiseIdCounter += 1;
  const id = options.id ?? `ztoast-promise-${Date.now()}-${promiseIdCounter}`;
  const resolvedDuration = options.duration ?? 4000;

  // trigger initial loading toast with infinite duration
  handlers.add(messages.loading, {
    ...options,
    id,
    variant: "loading",
    duration: Infinity,
  });

  // a two-argument then() attaches a rejection handler to the original promise,
  // so tracking it here never turns the caller's rejection into an
  // "unhandled promise rejection" warning. the caller still receives it.
  promise.then(
    (data) => {
      handlers?.add(resolveMessage(messages.success, data), {
        ...options,
        id,
        variant: "success",
        duration: resolvedDuration,
      });
    },
    (err: unknown) => {
      handlers?.add(resolveMessage(messages.error, err), {
        ...options,
        id,
        variant: "error",
        duration: resolvedDuration,
      });
    }
  );

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
