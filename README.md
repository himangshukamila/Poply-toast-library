# shalua

A modern, lightweight, and zero-runtime-dependency toast notification library for React. Built with a sleek popover design aesthetic, animated countdown progress bars with synchronized pause-on-hover timers, async promise management, and strict CSS injection sanitization.

---

## Features

- **Zero Runtime Dependencies**: Ultra-lean footprint. `react` and `react-dom` are peer dependencies only.
- **Sleek Popover Design**: Refined dark popover theme with support for titles, descriptions, and custom/built-in SVG icons.
- **Synchronized Countdown Progress Bar**: Animated progress track (0% to 100%) that freezes on hover alongside the auto-dismiss timer and resumes seamlessly on mouse leave.
- **Promise Lifecycle Integration**: Seamlessly transition from loading spinners to success or error states in place with `toast.promise()`.
- **Call from Anywhere**: Call `toast.success()`, `toast.error()`, `toast.promise()` inside React components or outside the render tree (e.g., API clients, Axios/Fetch interceptors).
- **Comprehensive Customization**: Control colors, gradients, background images, borders, shadows, corner radii, and font stacks per toast.
- **Security First**: Strict allowlist sanitization on all raw CSS strings to protect against CSS injection attacks without using `dangerouslySetInnerHTML`.
- **Dual ESM & CJS Build**: Pre-bundled with full TypeScript `.d.ts` declarations.

---

## Installation

```bash
npm install shalua
```

---

## Quick Start

### 1. Wrap your app in `<ToastProvider>` and mount `<ToastViewport />`

```tsx
import React from "react";
import { ToastProvider, ToastViewport, toast } from "shalua";

export function App() {
  return (
    <ToastProvider defaultPosition="top-right" defaultDuration={4000}>
      <MainContent />
      <ToastViewport />
    </ToastProvider>
  );
}

function MainContent() {
  return (
    <button onClick={() => toast.success("Project saved successfully")}>
      Save Project
    </button>
  );
}
```

---

## Usage Guide

### 1. Notification Variants & Descriptions

shalua provides built-in variants with clean inline SVG icons:

```tsx
// success notification with secondary description
toast.success("Profile updated", {
  description: "Your user preferences have been saved.",
});

// error notification
toast.error("Deployment failed", {
  description: "Check your build logs for more details.",
});

// informational notification
toast.info("Update available", {
  description: "Version 2.0 is now ready to download.",
});

// warning notification
toast.warning("Low disk space", {
  description: "You have less than 10% storage remaining.",
});

// loading toast (persists indefinitely until dismissed or updated)
toast.loading("Uploading assets...");

// default / custom toast
toast.show("New message received");
```

---

### 2. Animated Progress Bar

You can enable an animated progress countdown bar per toast or globally across the provider:

```tsx
// enable progress bar on a 6-second toast
toast.success("File uploaded", {
  duration: 6000,
  progressBar: true,
});
```

**Pause-on-Hover Behavior:**
- When the user hovers over the toast, the dismiss timer pauses and the progress bar freezes at the exact current percentage.
- When the mouse leaves, the timer resumes and the progress bar smoothly continues from the paused point to 100% over the remaining time.

To enable the progress bar on all toasts by default:
```tsx
<ToastProvider defaultProgressBar={true}>
  <App />
  <ToastViewport />
</ToastProvider>
```

---

### 3. Async Promise Management (`toast.promise`)

Track promises and update toasts in place from loading to success or failure:

```tsx
import { toast } from "shalua";

async function handleDeploy() {
  await toast.promise(
    deployProject(),
    {
      loading: "Deploying application to production...",
      success: (data) => `Deployed successfully to ${data.url}`,
      error: (err) => `Deployment failed: ${err.message}`,
    },
    {
      position: "bottom-right",
      progressBar: true,
    }
  );
}
```

---

### 4. Calling Outside React Components

Because shalua uses a module-level imperative store, you can trigger toasts directly inside API utility files, event listeners, or Axios/Fetch interceptors:

```ts
import { toast } from "shalua";

export async function apiClient(endpoint: string, options?: RequestInit) {
  try {
    const res = await fetch(endpoint, options);
    if (!res.ok) {
      toast.error("Network Error", {
        description: `Request failed with status code ${res.status}`,
      });
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    toast.error("Connection Failed", {
      description: "Could not establish connection to the backend server.",
    });
    throw error;
  }
}
```

---

### 5. Custom Styling & Theming

Every toast can be styled individually with full CSS sanitization:

```tsx
toast.show("Custom announcement", {
  position: "top-center",
  duration: 5000,
  progressBar: true,
  backgroundGradient: "linear-gradient(135deg, #1e1b4b, #312e81)",
  borderColor: "#6366f1",
  borderRadius: 14,
  boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.4)",
  textColor: "#e0e7ff",
  progressColor: "#818cf8",
  closable: true,
});
```

---

### 6. Hook Usage (`useToast`)

For programmatic access to active toast state or bulk operations inside components:

```tsx
import { useToast } from "shalua";

function NotificationCenter() {
  const { toasts, dismiss, dismissAll } = useToast();

  return (
    <div>
      <p>Active notifications: {toasts.length}</p>
      <button onClick={dismissAll}>Clear All</button>
    </div>
  );
}
```

---

## API Reference

### `<ToastProvider>` Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `defaultPosition` | `ToastPosition` | `"top-right"` | Fallback position for toasts (`top-left`, `top-center`, `top-right`, `bottom-left`, `bottom-center`, `bottom-right`) |
| `defaultDuration` | `number` | `4000` | Auto-dismiss duration in milliseconds |
| `defaultProgressBar` | `boolean` | `false` | Enable countdown progress bar on all toasts by default |
| `gap` | `number` | `12` | Pixel spacing between stacked toasts |

### `ToastOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `description` | `ReactNode` | `undefined` | Secondary text or element beneath the main title |
| `position` | `ToastPosition` | `"top-right"` | Anchor position in the viewport |
| `duration` | `number` | `4000` | Auto-dismiss time in ms. Set to `Infinity` for persistent toasts |
| `progressBar` | `boolean` | `false` | Displays the synchronized progress countdown bar |
| `progressColor` | `string` | `undefined` | Custom color for the progress bar fill |
| `closable` | `boolean` | `true` | Displays the dismiss button |
| `icon` | `ReactNode` | `undefined` | Custom icon element overriding the variant default |
| `id` | `string \| number` | `auto-generated` | Identifier for updating toasts in place |
| `onClose` | `() => void` | `undefined` | Callback fired when the toast is closed |
| `width` / `height` | `number \| string` | `undefined` | Custom dimensions |
| `background` | `string` | `undefined` | Solid background color |
| `backgroundGradient` | `string` | `undefined` | CSS gradient string |
| `backgroundImage` | `string` | `undefined` | Safe `url(...)` background image |
| `textColor` | `string` | `undefined` | Custom text color |
| `fontFamily` | `string` | `undefined` | Custom font family stack |
| `fontSize` / `fontWeight` | `number \| string` | `undefined` | Typography sizing |
| `border` / `borderColor` | `string` | `undefined` | Border shorthand and color |
| `borderRadius` | `number \| string` | `undefined` | Corner radius |
| `boxShadow` | `string` | `undefined` | Drop shadow definition |

---

## Security

shalua validates all raw style string inputs (`background`, `backgroundGradient`, `backgroundImage`, `fontFamily`, `border`, `borderColor`, `boxShadow`, `progressColor`) against strict allowlists before applying them. Any values containing unsafe patterns (such as `javascript:`, `expression()`, `@import`, or `<script>`) are automatically and silently dropped to prevent CSS injection.

---

## License

MIT
