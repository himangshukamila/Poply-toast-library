// this module is the single security boundary in the library.
// every prop that accepts a raw css-value string from the consumer
// (background, backgroundimage, gradients, fontfamily, border, boxshadow,
// progresscolor, coordinates, transforms) must pass through here before it is
// spread into a react style object.
//
// approach: allowlist known-safe patterns, reject everything else.
// we do not try to enumerate bad patterns (denylists always miss variants).
//
// every pattern below is written to stay linear on its input: no quantifier
// nested over an overlapping character class, and every value is length capped
// before any regex touches it, so a hostile string cannot stall the render
// thread through catastrophic backtracking (redos).

// hard cap applied to every raw string before it reaches a regex
const MAX_VALUE_LENGTH = 500;
const MAX_FONT_FAMILY_LENGTH = 200;

// characters and keywords that must never appear in a css value we accept.
const FORBIDDEN_SUBSTRINGS = [
  "javascript:",
  "vbscript:",
  "data:text/html",
  "data:application",
  "expression(",
  "behavior:",
  "-moz-binding",
  "@import",
  "@charset",
  "<script",
  "</",
  "eval(",
  // a backslash starts a css escape sequence (\6a -> "j"), which would let an
  // attacker spell "javascript:" in a way no substring check can see.
  "\\",
  "\0",
];

// strips css comments (/* ... */) to prevent comment-splitting bypasses.
// bounded iteration count: a nested/overlapping comment cannot loop forever.
function stripComments(input: string): string {
  let result = input;
  for (let pass = 0; pass < 8; pass += 1) {
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
  const lowered = value.toLowerCase();

  // check base forbidden keywords
  if (FORBIDDEN_SUBSTRINGS.some((bad) => lowered.includes(bad))) return true;

  // an unbalanced comment marker survived stripComments; never trust it
  if (lowered.includes("/*") || lowered.includes("*/")) return true;

  // curly braces are never allowed in css values
  if (lowered.includes("{") || lowered.includes("}")) return true;

  // semicolons are disallowed to prevent breakout unless strictly part of a safe data:image base64 url
  if (lowered.includes(";")) {
    const isSafeDataImage =
      /^url\((['"]?)data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,[a-zA-Z0-9+/=]+\1\)$/.test(
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

// "<width> <style>" prefix of a border shorthand; the optional colour tail is
// validated separately by sanitizeColor rather than by a loose `.*`
const BORDER_SHORTHAND_PATTERN =
  /^([0-9.]+(?:px|em|rem|%))\s+(solid|dashed|dotted|double|groove|ridge|inset|outset|none|hidden)(?:\s+(.+))?$/;

// plain numeric css length, e.g. 12px / 50% / 50vh
const DIMENSION_PATTERN = /^-?[0-9.]+(px|em|rem|%|vh|vw|vmin|vmax|dvh|svh|lvh|ch|ex)$/;

// conservative calc() body: arithmetic over numbers, units and nothing else
const CALC_PATTERN = /^calc\(\s*[-0-9.a-zA-Z%+\s/*()]+\s*\)$/;

// transform functions we are willing to emit
const TRANSFORM_FUNCTIONS = new Set([
  "translate",
  "translatex",
  "translatey",
  "translate3d",
  "scale",
  "scalex",
  "scaley",
  "scale3d",
  "rotate",
  "rotatex",
  "rotatey",
  "rotatez",
  "skew",
  "skewx",
  "skewy",
  "matrix",
  "matrix3d",
  "perspective",
]);

// a single `name(args)` token; nested parentheses are impossible by construction
const TRANSFORM_TOKEN_PATTERN = /^([a-zA-Z0-9]+)\(([^()]*)\)$/;
// comma separated numeric arguments with an optional unit suffix
const TRANSFORM_ARGS_PATTERN = /^-?[0-9.]+[a-z%]*(\s*,\s*-?[0-9.]+[a-z%]*)*$/;

// box-shadow: lengths, colours and the inset keyword, nothing that can fetch a url
const BOX_SHADOW_PATTERN = /^[a-zA-Z0-9#%.,\s()-]+$/;

export interface SanitizeResult {
  value: string | undefined;
  rejected: boolean;
}

// the caller supplied nothing: not a rejection, just nothing to apply
function absent(): SanitizeResult {
  return { value: undefined, rejected: false };
}

function reject(): SanitizeResult {
  return { value: undefined, rejected: true };
}

function accept(value: string): SanitizeResult {
  return { value, rejected: false };
}

type Prepared =
  | { kind: "absent" }
  | { kind: "invalid" }
  | { kind: "value"; value: string };

// shared front door for every string validator: guards the runtime type, caps
// the length, normalizes, and runs the forbidden-substring screen.
function prepare(input: unknown, maxLength = MAX_VALUE_LENGTH): Prepared {
  if (input == null) return { kind: "absent" };
  // consumers are not always typescript users; anything but a string is refused
  if (typeof input !== "string") return { kind: "invalid" };
  if (input.length > maxLength) return { kind: "invalid" };
  const value = normalize(input);
  if (!value || value.length > maxLength) return { kind: "invalid" };
  if (containsForbidden(value)) return { kind: "invalid" };
  return { kind: "value", value };
}

// validates a color value (solid color, rgb, hsl, oklch, var, or named color)
export function sanitizeColor(input: string | undefined): SanitizeResult {
  const prepared = prepare(input);
  if (prepared.kind === "absent") return absent();
  if (prepared.kind === "invalid") return reject();
  return COLOR_PATTERN.test(prepared.value) ? accept(prepared.value) : reject();
}

// validates a gradient string (linear-gradient/radial-gradient/conic-gradient)
export function sanitizeGradient(input: string | undefined): SanitizeResult {
  const prepared = prepare(input);
  if (prepared.kind === "absent") return absent();
  if (prepared.kind === "invalid") return reject();
  return GRADIENT_PATTERN.test(prepared.value) ? accept(prepared.value) : reject();
}

// validates a background-image url(...) value: http(s), relative, or data:image/*
export function sanitizeBackgroundImage(input: string | undefined): SanitizeResult {
  const prepared = prepare(input);
  if (prepared.kind === "absent") return absent();
  if (prepared.kind === "invalid") return reject();
  return SAFE_URL_PATTERN.test(prepared.value) ? accept(prepared.value) : reject();
}

// validates a font-family list
export function sanitizeFontFamily(input: string | undefined): SanitizeResult {
  const prepared = prepare(input, MAX_FONT_FAMILY_LENGTH);
  if (prepared.kind === "absent") return absent();
  if (prepared.kind === "invalid") return reject();
  return FONT_FAMILY_PATTERN.test(prepared.value) ? accept(prepared.value) : reject();
}

// validates a border shorthand string, e.g. "2px solid #333"
export function sanitizeBorderShorthand(input: string | undefined): SanitizeResult {
  const prepared = prepare(input);
  if (prepared.kind === "absent") return absent();
  if (prepared.kind === "invalid") return reject();

  const match = BORDER_SHORTHAND_PATTERN.exec(prepared.value);
  if (!match) return reject();

  const [, width, lineStyle, colorPart] = match;
  if (colorPart === undefined) return accept(`${width} ${lineStyle}`);

  // the colour segment goes through the colour validator instead of a wildcard
  const color = sanitizeColor(colorPart);
  if (color.rejected || !color.value) return reject();
  return accept(`${width} ${lineStyle} ${color.value}`);
}

// validates a plain numeric-with-unit css value, e.g. width, height, padding, borderradius, top, left, or offsets
export function sanitizeDimension(input: number | string | undefined): SanitizeResult {
  if (input == null) return absent();
  if (typeof input === "number") {
    return Number.isFinite(input) ? accept(`${input}px`) : reject();
  }

  const prepared = prepare(input);
  if (prepared.kind === "absent") return absent();
  if (prepared.kind === "invalid") return reject();

  const { value } = prepared;
  if (DIMENSION_PATTERN.test(value) || value === "auto" || value === "0") {
    return accept(value);
  }
  if (CALC_PATTERN.test(value)) return accept(value);
  return reject();
}

// validates a css transform string such as translate, scale, or rotate.
// the value is tokenized first so the matcher never backtracks across
// whitespace shared between a function body and the token separator.
export function sanitizeTransform(input: string | undefined): SanitizeResult {
  const prepared = prepare(input);
  if (prepared.kind === "absent") return absent();
  if (prepared.kind === "invalid") return reject();

  const { value } = prepared;
  const tokens = value.match(/[a-zA-Z0-9]+\([^()]*\)/g);
  if (!tokens) return reject();
  // the value must be exactly the tokens joined by single spaces: anything else
  // (stray keywords, unbalanced parens) means we did not understand all of it
  if (tokens.join(" ") !== value) return reject();

  for (const token of tokens) {
    const match = TRANSFORM_TOKEN_PATTERN.exec(token);
    if (!match) return reject();
    const [, name, args] = match;
    if (!TRANSFORM_FUNCTIONS.has(name.toLowerCase())) return reject();
    if (!TRANSFORM_ARGS_PATTERN.test(args.trim())) return reject();
  }

  return accept(value);
}

// validates an arbitrary boxshadow value against forbidden list and character set
export function sanitizeBoxShadow(input: string | undefined): SanitizeResult {
  const prepared = prepare(input, 300);
  if (prepared.kind === "absent") return absent();
  if (prepared.kind === "invalid") return reject();
  return BOX_SHADOW_PATTERN.test(prepared.value) ? accept(prepared.value) : reject();
}
