export default [
  'strapi::logger',
  'strapi::errors',
  // Rate limiting - doit être avant les autres middlewares pour protéger tous les endpoints
  {
    name: 'global::rate-limit',
    config: {
      max: 100,           // 100 requêtes par minute par défaut
      windowMs: 60000,    // Fenêtre de 1 minute
      message: 'Trop de requêtes, veuillez réessayer plus tard.',
      sensitiveEndpoints: [
        // Auth: 10 req/min
        { pattern: /^\/api\/auth\//, max: 10, windowMs: 60000 },
        // Login ProConnect: 5 req/min
        { pattern: /^\/api\/auth\/proconnect$/, max: 5, windowMs: 60000 },
        // Upload: 10 req/min
        { pattern: /^\/api\/upload/, max: 10, windowMs: 60000 },
      ],
    },
  },
  'strapi::security',
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
