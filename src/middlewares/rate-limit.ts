/**
 * Rate Limiting Middleware
 * Limite le nombre de requêtes par IP pour protéger contre les abus
 */

interface RateLimitConfig {
  // Nombre de requêtes autorisées par fenêtre
  max: number;
  // Durée de la fenêtre en millisecondes
  windowMs: number;
  // Message d'erreur personnalisé
  message?: string;
  // Endpoints avec limites spéciales (plus restrictives)
  sensitiveEndpoints?: {
    pattern: RegExp;
    max: number;
    windowMs: number;
  }[];
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

// Store en mémoire pour le rate limiting
// Note: En production avec plusieurs instances, utiliser Redis
const ipRecords = new Map<string, RequestRecord>();
const sensitiveRecords = new Map<string, RequestRecord>();

// Nettoyage périodique des entrées expirées (toutes les 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipRecords.entries()) {
    if (record.resetTime < now) {
      ipRecords.delete(key);
    }
  }
  for (const [key, record] of sensitiveRecords.entries()) {
    if (record.resetTime < now) {
      sensitiveRecords.delete(key);
    }
  }
}, 5 * 60 * 1000);

const defaultConfig: RateLimitConfig = {
  // 100 requêtes par minute par défaut
  max: 100,
  windowMs: 60 * 1000,
  message: 'Trop de requêtes, veuillez réessayer plus tard.',
  sensitiveEndpoints: [
    // Auth endpoints: 10 requêtes par minute
    { pattern: /^\/api\/auth\//, max: 10, windowMs: 60 * 1000 },
    // Login/register: 5 requêtes par minute
    { pattern: /^\/api\/auth\/proconnect$/, max: 5, windowMs: 60 * 1000 },
    // Upload: 10 requêtes par minute
    { pattern: /^\/api\/upload/, max: 10, windowMs: 60 * 1000 },
  ],
};

export default (config: Partial<RateLimitConfig> = {}) => {
  const finalConfig = { ...defaultConfig, ...config };

  return async (ctx: any, next: () => Promise<void>) => {
    // Extraire l'IP du client
    const ip = ctx.request.ip ||
               ctx.request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               ctx.request.headers['x-real-ip'] ||
               'unknown';

    const path = ctx.request.path;
    const now = Date.now();

    // Vérifier si c'est un endpoint sensible
    let maxRequests = finalConfig.max;
    let windowMs = finalConfig.windowMs;
    let recordStore = ipRecords;
    let recordKey = ip;

    for (const sensitive of finalConfig.sensitiveEndpoints || []) {
      if (sensitive.pattern.test(path)) {
        maxRequests = sensitive.max;
        windowMs = sensitive.windowMs;
        recordStore = sensitiveRecords;
        recordKey = `${ip}:${path}`;
        break;
      }
    }

    // Récupérer ou créer l'enregistrement
    let record = recordStore.get(recordKey);

    if (!record || record.resetTime < now) {
      record = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    record.count++;
    recordStore.set(recordKey, record);

    // Ajouter les headers de rate limit
    const remaining = Math.max(0, maxRequests - record.count);
    ctx.set('X-RateLimit-Limit', maxRequests.toString());
    ctx.set('X-RateLimit-Remaining', remaining.toString());
    ctx.set('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000).toString());

    // Vérifier si la limite est dépassée
    if (record.count > maxRequests) {
      ctx.status = 429;
      ctx.body = {
        error: {
          status: 429,
          name: 'TooManyRequestsError',
          message: finalConfig.message,
        },
      };
      ctx.set('Retry-After', Math.ceil((record.resetTime - now) / 1000).toString());
      return;
    }

    await next();
  };
};
