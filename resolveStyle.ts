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
} from "./sanitize";

// resolves a toast style options object into a plain css properties object,
// running every string valued field through the sanitizer first.
// any value that fails sanitization is silently dropped rather than throwing.
export function resolveToastStyle(options: ToastStyleOptions): CSSProperties {
  const style: CSSProperties = {};

  const width = sanitizeDimension(options.width);
  if (!width.rejected && width.value) style.width = width.value;

  const height = sanitizeDimension(options.height);
  if (!height.rejected && height.value) style.height = height.value;

  const padding = sanitizeDimension(options.padding);
  if (!padding.rejected && padding.value) style.padding = padding.value;

  const borderRadius = sanitizeDimension(options.borderRadius);
  if (!borderRadius.rejected && borderRadius.value) style.borderRadius = borderRadius.value;

  const borderWidth = sanitizeDimension(options.borderWidth);
  if (!borderWidth.rejected && borderWidth.value) style.borderWidth = borderWidth.value;

  const fontSize = sanitizeDimension(options.fontSize);
  if (!fontSize.rejected && fontSize.value) style.fontSize = fontSize.value;

  // background: gradient takes precedence over solid color if both given,
  // background image layers on top via the shorthand background property
  const gradient = sanitizeGradient(options.backgroundGradient);
  const solidBg = sanitizeColor(options.background);
  const bgImage = sanitizeBackgroundImage(options.backgroundImage);

  const layers: string[] = [];
  if (!bgImage.rejected && bgImage.value) layers.push(bgImage.value);
  if (!gradient.rejected && gradient.value) layers.push(gradient.value);
  if (layers.length > 0) {
    style.backgroundImage = layers.join(", ");
  }
  if (!solidBg.rejected && solidBg.value) {
    style.backgroundColor = solidBg.value;
  }

  const textColor = sanitizeColor(options.textColor);
  if (!textColor.rejected && textColor.value) style.color = textColor.value;

  const fontFamily = sanitizeFontFamily(options.fontFamily);
  if (!fontFamily.rejected && fontFamily.value) style.fontFamily = fontFamily.value;

  if (
    options.fontWeight !== undefined &&
    (typeof options.fontWeight === "number" ||
      /^[a-zA-Z0-9]+$/.test(String(options.fontWeight)))
  ) {
    style.fontWeight = options.fontWeight;
  }

  const border = sanitizeBorderShorthand(options.border);
  if (!border.rejected && border.value) style.border = border.value;

  const borderColor = sanitizeColor(options.borderColor);
  if (!borderColor.rejected && borderColor.value) style.borderColor = borderColor.value;

  const boxShadow = sanitizeBoxShadow(options.boxShadow);
  if (!boxShadow.rejected && boxShadow.value) style.boxShadow = boxShadow.value;

  return style;
}
