// this module is the single security boundary in the library.
// every prop that accepts a raw css-value string from the consumer
// (background, backgroundimage, gradients, fontfamily, border, boxshadow, progresscolor)
// must pass through here before it is spread into a style object.
//
// approach: allowlist known-safe patterns, reject everything else.
// we do not try to enumerate bad patterns (denylists always miss variants).

// characters and keywords that must never appear in a css value we accept.
const FORBIDDEN_SUBSTRINGS = [
  "javascript:",
  "vbscript:",
  "data:text/html",
  "expression(",
  "behavior:",
  "-moz-binding",
  "@import",
  "<script",
  "</",
  "eval(",
  "\0",
];

// recursively strips css comments (/* ... */) to prevent comment-splitting bypasses
function stripComments(input: string): string {
  let result = input;
  while (result.includes("/*")) {
    const next = result.replace(/\/\*[\s\S]*?\*\//g, "");
    if (next === result) break;
    result = next;
  }
  return result;
}

// strips control characters and normalizes whitespace
function normalize(value: string): string {
  return stripComments(value)
    .replace(/[\x00-\x1f\x7f-\x9f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function containsForbidden(value: string): boolean {
  const lowered = normalize(value).toLowerCase();

  // check base forbidden keywords
  if (FORBIDDEN_SUBSTRINGS.some((bad) => lowered.includes(bad))) return true;

  // curly braces are never allowed in css values
  if (lowered.includes("{") || lowered.includes("}")) return true;

  // semicolons are disallowed to prevent breakout unless strictly part of a safe data:image base64 url
  if (lowered.includes(";")) {
    const isSafeDataImage = /^url\((['"]?)data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,[a-zA-Z0-9+/=]+\1\)$/.test(
      lowered
    );
    if (!isSafeDataImage) return true;
  }

  return false;
}

// hex, rgb(a), hsl(a), oklch, oklab, named colors, or css var()
const COLOR_PATTERN =
  /^(#[0-9a-fA-F]{3,8}|(rgba?|hsla?|oklch|oklab)\([^()]*\)|var\(--[a-zA-Z0-9-]+(,\s*[^()]*)?\)|[a-zA-Z]+)$/;

// linear-gradient / radial-gradient / conic-gradient with safe contents only
const GRADIENT_PATTERN =
  /^(linear|radial|conic)-gradient\(\s*[a-zA-Z0-9#%.,\s()-]*\)$/;

// url(...) restricted to http(s), relative paths, or same-origin-safe data:image/*
const SAFE_URL_PATTERN =
  /^url\((['"]?)(https?:\/\/[^'")]+|\/[^'")]+|\.\/?[^'")]+|data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,[a-zA-Z0-9+/=]+)\1\)$/;

// font-family list: letters, numbers, spaces, hyphens, commas, quotes only
const FONT_FAMILY_PATTERN = /^[a-zA-Z0-9\s,'"-]+$/;

// generic shorthand values like border widths/styles: "1px solid", "2px dashed #333"
const BORDER_SHORTHAND_PATTERN =
  /^[0-9.]+(px|em|rem|%)\s+(solid|dashed|dotted|double|groove|ridge|inset|outset|none)(\s+.*)?$/;

export interface SanitizeResult {
  value: string | undefined;
  rejected: boolean;
}

function reject(): SanitizeResult {
  return { value: undefined, rejected: true };
}

function accept(value: string): SanitizeResult {
  return { value, rejected: false };
}

// validates a color value (solid color, rgb, hsl, oklch, var, or named color)
export function sanitizeColor(input: string | undefined): SanitizeResult {
  if (input == null) return accept(undefined as unknown as string);
  const value = normalize(input);
  if (!value || containsForbidden(value)) return reject();
  if (COLOR_PATTERN.test(value)) return accept(value);
  return reject();
}

// validates a gradient string (linear-gradient/radial-gradient/conic-gradient)
export function sanitizeGradient(input: string | undefined): SanitizeResult {
  if (input == null) return accept(undefined as unknown as string);
  const value = normalize(input);
  if (!value || containsForbidden(value)) return reject();
  if (GRADIENT_PATTERN.test(value)) return accept(value);
  return reject();
}

// validates a background-image url(...) value: http(s), relative, or data:image/*
export function sanitizeBackgroundImage(input: string | undefined): SanitizeResult {
  if (input == null) return accept(undefined as unknown as string);
  const value = normalize(input);
  if (!value || containsForbidden(value)) return reject();
  if (SAFE_URL_PATTERN.test(value)) return accept(value);
  return reject();
}

// validates a font-family list
export function sanitizeFontFamily(input: string | undefined): SanitizeResult {
  if (input == null) return accept(undefined as unknown as string);
  const value = normalize(input);
  if (!value || containsForbidden(value)) return reject();
  if (FONT_FAMILY_PATTERN.test(value) && value.length <= 200) return accept(value);
  return reject();
}

// validates a border shorthand string, e.g. "2px solid #333"
export function sanitizeBorderShorthand(input: string | undefined): SanitizeResult {
  if (input == null) return accept(undefined as unknown as string);
  const value = normalize(input);
  if (!value || containsForbidden(value)) return reject();
  if (BORDER_SHORTHAND_PATTERN.test(value)) return accept(value);
  return reject();
}

// validates a plain numeric-with-unit css value, e.g. width/height/padding/borderradius
export function sanitizeDimension(input: number | string | undefined): SanitizeResult {
  if (input == null) return accept(undefined as unknown as string);
  if (typeof input === "number") {
    return Number.isFinite(input) ? accept(`${input}px`) : reject();
  }
  const value = normalize(input);
  if (!value || containsForbidden(value)) return reject();
  if (/^[0-9.]+(px|em|rem|%|vh|vw)$/.test(value) || value === "auto") return accept(value);
  return reject();
}

// validates an arbitrary boxshadow value against forbidden list and character set
export function sanitizeBoxShadow(input: string | undefined): SanitizeResult {
  if (input == null) return accept(undefined as unknown as string);
  const value = normalize(input);
  if (!value || value.length > 300 || containsForbidden(value)) return reject();
  if (/^[a-zA-Z0-9#%.,\s()-]+$/.test(value)) return accept(value);
  return reject();
}
