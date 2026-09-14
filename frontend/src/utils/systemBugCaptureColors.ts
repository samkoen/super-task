const MODERN_COLOR = /oklch|oklab|(?<![a-z-])lab\(|(?<![a-z-])lch\(|color-mix|color\(/i;
const COLOR_FN = /(?:oklch|oklab|lab|lch|color-mix|color)\(/gi;

/** html-to-image copies computed styles into an SVG; Chrome/WebView oklch/lab break that. */
export function cssValueToSafeColor(value: string): string {
  if (!value || !MODERN_COLOR.test(value)) return value;
  let out = "";
  let cursor = 0;
  COLOR_FN.lastIndex = 0;
  let match = COLOR_FN.exec(value);
  while (match) {
    const start = match.index;
    const end = matchingParenEnd(value, start + match[0].length - 1);
    if (end < 0) break;
    out += value.slice(cursor, start) + tokenToRgb(value.slice(start, end + 1));
    cursor = end + 1;
    COLOR_FN.lastIndex = cursor;
    match = COLOR_FN.exec(value);
  }
  return out + value.slice(cursor);
}

export async function withSafeComputedColors<T>(run: () => Promise<T>): Promise<T> {
  const proto = CSSStyleDeclaration.prototype;
  const originalGet = proto.getPropertyValue;
  const cssTextDesc = Object.getOwnPropertyDescriptor(proto, "cssText");
  proto.getPropertyValue = function patchedGet(name: string) {
    return cssValueToSafeColor(originalGet.call(this, name));
  };
  try {
    if (cssTextDesc?.get) {
      Object.defineProperty(proto, "cssText", {
        configurable: true,
        enumerable: cssTextDesc.enumerable,
        get() {
          return cssValueToSafeColor(cssTextDesc.get!.call(this));
        },
        set: cssTextDesc.set,
      });
    }
    return await run();
  } finally {
    proto.getPropertyValue = originalGet;
    if (cssTextDesc) {
      try {
        Object.defineProperty(proto, "cssText", cssTextDesc);
      } catch {
        /* keep the original getter if the engine forbids redefine */
      }
    }
  }
}

function matchingParenEnd(value: string, openAt: number): number {
  let depth = 0;
  for (let i = openAt; i < value.length; i += 1) {
    if (value[i] === "(") depth += 1;
    else if (value[i] === ")") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

let colorCtx: CanvasRenderingContext2D | null | undefined;

function tokenToRgb(token: string): string {
  if (colorCtx === undefined) {
    colorCtx = document.createElement("canvas").getContext("2d");
  }
  const ctx = colorCtx;
  if (!ctx) return "rgba(0,0,0,0)";
  try {
    ctx.fillStyle = "#000";
    ctx.fillStyle = token;
    const next = String(ctx.fillStyle);
    return next === "#000" || next === "#000000" ? tokenToRgbFallback(token) : next;
  } catch {
    return "rgba(0,0,0,0)";
  }
}

function tokenToRgbFallback(token: string): string {
  return /oklch|oklab|lab\(|lch\(|color-mix|color\(/.test(token) ? "rgba(0,0,0,0)" : token;
}
