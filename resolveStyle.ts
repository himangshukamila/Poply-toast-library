import type { CSSProperties } from "react";
import type { ToastStyleOptions } from "./types";
import {
  sanitizeColor,
  sanitizeGradient,
  sanitizeBackgroundImage,
  sanitizeFontFamily,
  sanitizeBorderShorthand,
  sanitizeDimension,
  sanitizeBoxShadow,
  type SanitizeResult,
} from "./sanitize";

// applies a sanitized result onto the style object, skipping anything that was
// rejected or absent. keeps every call site below to a single line.
function apply(style: CSSProperties, key: keyof CSSProperties, result: SanitizeResult): void {
  if (result.rejected || result.value === undefined) return;
  (style as Record<string, string>)[key as string] = result.value;
}

// font-weight is either a finite number or a bare keyword such as "bold"
function isSafeFontWeight(value: number | string): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  return typeof value === "string" && /^[a-zA-Z0-9]{1,20}$/.test(value);
}

// resolves a toast style options object into a plain css properties object,
// running every string valued field through the sanitizer first.
// any value that fails sanitization is silently dropped rather than throwing.
export function resolveToastStyle(options: ToastStyleOptions): CSSProperties {
  const style: CSSProperties = {};

  apply(style, "width", sanitizeDimension(options.width));
  apply(style, "height", sanitizeDimension(options.height));
  apply(style, "padding", sanitizeDimension(options.padding));
  apply(style, "borderRadius", sanitizeDimension(options.borderRadius));
  apply(style, "borderWidth", sanitizeDimension(options.borderWidth));
  apply(style, "fontSize", sanitizeDimension(options.fontSize));

  // background: gradient takes precedence over solid color if both given,
  // background image layers on top via the shorthand background property
  const gradient = sanitizeGradient(options.backgroundGradient);
  const bgImage = sanitizeBackgroundImage(options.backgroundImage);

  const layers: string[] = [];
  if (!bgImage.rejected && bgImage.value) layers.push(bgImage.value);
  if (!gradient.rejected && gradient.value) layers.push(gradient.value);
  if (layers.length > 0) {
    style.backgroundImage = layers.join(", ");
  }

  apply(style, "backgroundColor", sanitizeColor(options.background));
  apply(style, "color", sanitizeColor(options.textColor));
  apply(style, "fontFamily", sanitizeFontFamily(options.fontFamily));

  if (options.fontWeight !== undefined && isSafeFontWeight(options.fontWeight)) {
    style.fontWeight = options.fontWeight;
  }

  // order matters: the shorthand is written first so an explicit borderColor
  // still wins over the colour baked into it
  apply(style, "border", sanitizeBorderShorthand(options.border));
  apply(style, "borderColor", sanitizeColor(options.borderColor));
  apply(style, "boxShadow", sanitizeBoxShadow(options.boxShadow));

  return style;
}
