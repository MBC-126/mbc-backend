"use strict";
/**
 * Health check controller
 * Si l'endpoint répond, Strapi est opérationnel
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    async check(ctx) {
        // Si on arrive ici, Strapi est up
        // Test DB optionnel pour monitoring plus poussé
        ctx.body = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        };
    }
};
