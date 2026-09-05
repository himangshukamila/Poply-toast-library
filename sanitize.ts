// this module is the single security boundary in the library.
// every prop that accepts a raw CSS-value string from the consumer
// (background, backgroundImage, gradients, fontFamily, border, boxShadow)
// must pass through here before it is spread into a style={} object.
//
// approach: allowlist known-safe patterns, reject everything else.
// we do NOT try to enumerate bad patterns (denylists always miss variants,
// e.g. "javascript:", "java\tscript:", unicode-escaped forms, etc).

// characters/keywords that must never appear in a CSS value we accept,
// regardless of which allowlist pattern it otherwise matches. checked
// after normalizing whitespace and stripping comments, on a lowercased copy.
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
];

// strips CSS comments (/* ... */) which can otherwise be used to split
// forbidden keywords across a "safe-looking" boundary, e.g. "java/**/script:"
function stripComments(value: string): string {
  return value.replace(/\/\*[\s\S]*?\*\//g, "");
}

function normalize(value: string): string {
  return stripComments(value).replace(/\s+/g, " ").trim();
}

function containsForbidden(value: string): boolean {
  const lowered = normalize(value).toLowerCase();
  return FORBIDDEN_SUBSTRINGS.some((bad) => lowered.includes(bad));
}

// hex, rgb(a), hsl(a), named colors, or css var()
const COLOR_PATTERN =
  /^(#[0-9a-fA-F]{3,8}|rgba?\([^()]*\)|hsla?\([^()]*\)|var\(--[a-zA-Z0-9-]+(,\s*[^()]*)?\)|[a-zA-Z]+)$/;

// linear-gradient / radial-gradient / conic-gradient with color-stop-like
// contents only — no url(), no nested functions we don't expect.
const GRADIENT_PATTERN =
  /^(linear|radial|conic)-gradient\(\s*[a-zA-Z0-9#%.,\s()-]*\)$/;

// url(...) restricted to http(s), relative paths, or same-origin-safe
// data:image/* (never data:text/html, blocked above already, but be explicit).
const SAFE_URL_PATTERN =
  /^url\((['"]?)(https?:\/\/[^'")]+|\/[^'")]+|\.\/?[^'")]+|data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,[a-zA-Z0-9+/=]+)\1\)$/;

// font-family list: letters, numbers, spaces, hyphens, commas, quotes only
const FONT_FAMILY_PATTERN = /^[a-zA-Z0-9\s,'"-]+$/;

// generic short-hand values like border widths/styles: "1px solid", "2px dashed #333"
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

/** Validates a color value (solid color, rgba, hsla, var(), or named color). */
export function sanitizeColor(input: string | undefined): SanitizeResult {
  if (input == null) return accept(undefined as unknown as string);
  const value = normalize(input);
  if (!value || containsForbidden(value)) return reject();
  if (COLOR_PATTERN.test(value)) return accept(value);
  return reject();
}

/** Validates a gradient string (linear-gradient/radial-gradient/conic-gradient). */
export function sanitizeGradient(input: string | undefined): SanitizeResult {
  if (input == null) return accept(undefined as unknown as string);
  const value = normalize(input);
  if (!value || containsForbidden(value)) return reject();
  if (GRADIENT_PATTERN.test(value)) return accept(value);
  return reject();
}

/** Validates a background-image url(...) value — http(s), relative, or data:image/*. */
export function sanitizeBackgroundImage(input: string | undefined): SanitizeResult {
  if (input == null) return accept(undefined as unknown as string);
  const value = normalize(input);
  if (!value || containsForbidden(value)) return reject();
  if (SAFE_URL_PATTERN.test(value)) return accept(value);
  return reject();
}

/** Validates a font-family list. */
export function sanitizeFontFamily(input: string | undefined): SanitizeResult {
  if (input == null) return accept(undefined as unknown as string);
  const value = normalize(input);
  if (!value || containsForbidden(value)) return reject();
  if (FONT_FAMILY_PATTERN.test(value) && value.length <= 200) return accept(value);
  return reject();
}

/** Validates a border shorthand string, e.g. "2px solid #333". */
export function sanitizeBorderShorthand(input: string | undefined): SanitizeResult {
  if (input == null) return accept(undefined as unknown as string);
  const value = normalize(input);
  if (!value || containsForbidden(value)) return reject();
  if (BORDER_SHORTHAND_PATTERN.test(value)) return accept(value);
  return reject();
}

/** Validates a plain numeric-with-unit CSS value, e.g. width/height/padding/borderRadius. */
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

/** Validates an arbitrary boxShadow value against the forbidden-substring list only,
 *  since box-shadow syntax is too varied for a tight allowlist pattern; length-capped. */
export function sanitizeBoxShadow(input: string | undefined): SanitizeResult {
  if (input == null) return accept(undefined as unknown as string);
  const value = normalize(input);
  if (!value || value.length > 300 || containsForbidden(value)) return reject();
  // restrict to characters that can plausibly appear in a box-shadow value
  if (/^[a-zA-Z0-9#%.,\s()-]+$/.test(value)) return accept(value);
  return reject();
}
