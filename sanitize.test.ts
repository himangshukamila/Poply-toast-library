import { describe, expect, it } from "vitest";
import {
  sanitizeColor,
  sanitizeGradient,
  sanitizeBackgroundImage,
  sanitizeFontFamily,
  sanitizeBorderShorthand,
  sanitizeDimension,
  sanitizeTransform,
  sanitizeBoxShadow,
} from "./sanitize";

// testing css sanitizer validators and injection defense
describe("sanitizeColor", () => {
  it("allows safe hex, rgb, hsl, oklch, var, and named colors", () => {
    expect(sanitizeColor("#fff").rejected).toBe(false);
    expect(sanitizeColor("#1f2937").rejected).toBe(false);
    expect(sanitizeColor("rgba(0, 0, 0, 0.5)").rejected).toBe(false);
    expect(sanitizeColor("hsla(200, 50%, 50%, 0.8)").rejected).toBe(false);
    expect(sanitizeColor("oklch(0.6 0.25 150)").rejected).toBe(false);
    expect(sanitizeColor("var(--brand-color)").rejected).toBe(false);
    expect(sanitizeColor("red").rejected).toBe(false);
  });

  it("rejects malicious injection attempts", () => {
    expect(sanitizeColor("javascript:alert(1)").rejected).toBe(true);
    expect(sanitizeColor("url(javascript:evil())").rejected).toBe(true);
    expect(sanitizeColor("expression(alert(1))").rejected).toBe(true);
    expect(sanitizeColor("<script>alert(1)</script>").rejected).toBe(true);
    expect(sanitizeColor("/*comment*/javascript:alert(1)").rejected).toBe(true);
    expect(sanitizeColor("/*/*nested*/*/javascript:alert(1)").rejected).toBe(true);
    expect(sanitizeColor("red; background: black").rejected).toBe(true);
    expect(sanitizeColor("red} body { background: black").rejected).toBe(true);
    expect(sanitizeColor("eval(alert(1))").rejected).toBe(true);
  });
});

describe("sanitizeGradient", () => {
  it("allows safe gradient strings", () => {
    expect(
      sanitizeGradient("linear-gradient(135deg, #1f2937, #111827)").rejected
    ).toBe(false);
    expect(
      sanitizeGradient("radial-gradient(circle, red, yellow)").rejected
    ).toBe(false);
    expect(
      sanitizeGradient("conic-gradient(from 0deg, red, blue)").rejected
    ).toBe(false);
  });

  it("rejects invalid or unsafe gradient strings", () => {
    expect(
      sanitizeGradient("linear-gradient(url(javascript:alert(1)))").rejected
    ).toBe(true);
    expect(sanitizeGradient("@import url('evil.css')").rejected).toBe(true);
    expect(sanitizeGradient("linear-gradient(red, blue); background: evil").rejected).toBe(true);
  });
});

describe("sanitizeBackgroundImage", () => {
  it("allows safe http, https, relative, and data image urls", () => {
    expect(sanitizeBackgroundImage("url('https://example.com/bg.png')").rejected).toBe(false);
    expect(sanitizeBackgroundImage("url('/assets/bg.jpg')").rejected).toBe(false);
    expect(sanitizeBackgroundImage("url('./bg.webp')").rejected).toBe(false);
    expect(
      sanitizeBackgroundImage(
        "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=')"
      ).rejected
    ).toBe(false);
  });

  it("rejects dangerous url schemes", () => {
    expect(sanitizeBackgroundImage("url('javascript:alert(1)')").rejected).toBe(true);
    expect(sanitizeBackgroundImage("url('data:text/html,<script>alert(1)</script>')").rejected).toBe(true);
    expect(sanitizeBackgroundImage("url('vbscript:msgbox')").rejected).toBe(true);
  });
});

describe("sanitizeFontFamily", () => {
  it("allows safe font family stacks", () => {
    expect(sanitizeFontFamily("Inter, sans-serif").rejected).toBe(false);
    expect(sanitizeFontFamily("'Roboto', 'Helvetica Neue', Arial").rejected).toBe(false);
  });

  it("rejects suspicious font family strings", () => {
    expect(sanitizeFontFamily("javascript:evil").rejected).toBe(true);
    expect(sanitizeFontFamily("</style><script>alert(1)</script>").rejected).toBe(true);
    expect(sanitizeFontFamily("Arial; color: red").rejected).toBe(true);
  });
});

describe("sanitizeBorderShorthand", () => {
  it("allows safe border declarations", () => {
    expect(sanitizeBorderShorthand("1px solid #333").rejected).toBe(false);
    expect(sanitizeBorderShorthand("2px dashed rgba(0, 0, 0, 0.2)").rejected).toBe(false);
    expect(sanitizeBorderShorthand("0.5rem dotted blue").rejected).toBe(false);
  });

  it("rejects invalid border values", () => {
    expect(sanitizeBorderShorthand("javascript:alert(1)").rejected).toBe(true);
    expect(sanitizeBorderShorthand("1px solid red; evil: 1").rejected).toBe(true);
  });
});

describe("sanitizeDimension", () => {
  it("handles numbers and valid css dimension units", () => {
    expect(sanitizeDimension(20).value).toBe("20px");
    expect(sanitizeDimension("300px").value).toBe("300px");
    expect(sanitizeDimension("50%").value).toBe("50%");
    expect(sanitizeDimension("50vh").value).toBe("50vh");
    expect(sanitizeDimension("100vw").value).toBe("100vw");
    expect(sanitizeDimension("10dvh").value).toBe("10dvh");
    expect(sanitizeDimension("calc(100vh - 20px)").value).toBe("calc(100vh - 20px)");
    expect(sanitizeDimension("0").value).toBe("0");
    expect(sanitizeDimension("auto").value).toBe("auto");
    expect(sanitizeDimension(NaN).rejected).toBe(true);
    expect(sanitizeDimension("100px; color: red").rejected).toBe(true);
  });
});

describe("sanitizeTransform", () => {
  it("allows safe css transform strings", () => {
    expect(sanitizeTransform("translateX(-50%)").rejected).toBe(false);
    expect(sanitizeTransform("translate(-50%, -50%)").rejected).toBe(false);
    expect(sanitizeTransform("scale(1.05)").rejected).toBe(false);
    expect(sanitizeTransform("rotate(45deg)").rejected).toBe(false);
  });

  it("rejects dangerous or malformed transform strings", () => {
    expect(sanitizeTransform("javascript:alert(1)").rejected).toBe(true);
    expect(sanitizeTransform("translate(0); evil: 1").rejected).toBe(true);
  });
});

describe("sanitizeBoxShadow", () => {
  it("allows safe shadow definitions", () => {
    expect(sanitizeBoxShadow("0 4px 12px rgba(0, 0, 0, 0.15)").rejected).toBe(false);
    expect(sanitizeBoxShadow("inset 0 2px 4px #000").rejected).toBe(false);
  });

  it("rejects expressions and injection in shadows", () => {
    expect(sanitizeBoxShadow("expression(alert(1))").rejected).toBe(true);
    expect(sanitizeBoxShadow("behavior:url(evil.htc)").rejected).toBe(true);
    expect(sanitizeBoxShadow("0 4px 12px #000; color: red").rejected).toBe(true);
  });
});

