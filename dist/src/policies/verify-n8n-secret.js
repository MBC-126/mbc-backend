"use strict";
/**
 * Policy pour vérifier que la requête vient de n8n
 * Vérifie le header X-N8N-Secret
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (policyContext, config, { strapi }) => {
    const secretHeader = policyContext.request.headers['x-n8n-secret'];
    const expectedSecret = process.env.N8N_API_SECRET;
    if (!expectedSecret) {
        console.error('⚠️ N8N_API_SECRET non configuré dans .env');
        return false;
    }
    if (secretHeader !== expectedSecret) {
        console.warn('🚫 Tentative d\'accès non autorisée aux endpoints n8n');
        return false;
    }
    return true;
};
