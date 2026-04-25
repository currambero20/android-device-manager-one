import xss from "xss";

/**
 * Sanitización XSS - Limpia entrada de usuario para prevenir ataques
 */
export function sanitizeInput(input: unknown): unknown {
  if (typeof input === "string") {
    return xss(input, {
      whiteList: {
        a: ["href", "title", "target", "class", "id"],
        b: ["class", "id"],
        i: ["class", "id"],
        em: ["class", "id"],
        strong: ["class", "id"],
        p: ["class", "id"],
        br: ["class", "id"],
        ul: ["class", "id"],
        ol: ["class", "id"],
        li: ["class", "id"],
        h1: ["class", "id"],
        h2: ["class", "id"],
        h3: ["class", "id"],
        h4: ["class", "id"],
        h5: ["class", "id"],
        h6: ["class", "id"],
        span: ["class", "id", "style"],
        div: ["class", "id", "style"],
        img: ["src", "alt", "class", "id", "width", "height"],
        pre: ["class", "id"],
        code: ["class", "id"],
      },
      stripIgnoreTag: true,
      stripIgnoreTagBody: ["script", "style"],
    });
  }
  
  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }
  
  if (input && typeof input === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
}

/**
 * Middleware Express para sanitizar todas las entradas JSON
 */
export function xssMiddleware(req: any, res: any, next: any) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeInput(req.body);
  }
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeInput(req.query);
  }
  if (req.params && typeof req.params === "object") {
    req.params = sanitizeInput(req.params);
  }
  next();
}

/**
 * Función helper para sanitizar strings individuales
 */
export function sanitizeString(str: string): string {
  return xss(str);
}

/**
 * Función helper para sanitizar HTML
 */
export function sanitizeHtml(html: string): string {
  return xss(html, {
    whiteList: {
      a: ["href", "title", "target", "class", "id"],
      b: ["class", "id"],
      i: ["class", "id"],
      em: ["class", "id"],
      strong: ["class", "id"],
      p: ["class", "id"],
      br: ["class", "id"],
      ul: ["class", "id"],
      ol: ["class", "id"],
      li: ["class", "id"],
      h1: ["class", "id"],
      h2: ["class", "id"],
      h3: ["class", "id"],
    },
  });
}
