// /src/middlewares/proconnect-auth.js
'use strict';

/**
 * Middleware ProConnect Auth
 *
 * SECURITE: L'auto-authentification en dev a été DÉSACTIVÉE (DEV-001)
 * pour prévenir les risques de sécurité si NODE_ENV n'est pas correctement
 * configuré en production.
 *
 * Pour le développement local avec authentification simulée, utilisez
 * les endpoints de test ou configurez une session ProConnect de dev.
 */

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    // Middleware passthrough - l'authentification est gérée par
    // le plugin users-permissions de Strapi
    await next();
  };
};