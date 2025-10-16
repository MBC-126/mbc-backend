"use strict";
/**
 * Policy pour permettre l'accès public aux routes n8n
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (policyContext, config, { strapi }) => {
    // Toujours autoriser l'accès
    return true;
};
