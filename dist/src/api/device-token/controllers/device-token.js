"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController('api::device-token.device-token', ({ strapi }) => ({
    /**
     * POST /devices/register - Enregistrer un token FCM
     */
    async register(ctx) {
        var _a;
        const userId = (_a = ctx.state.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return ctx.unauthorized('Authentification requise');
        }
        const { token, platform } = ctx.request.body;
        if (!token || !platform) {
            return ctx.badRequest('token et platform sont requis');
        }
        if (!['ios', 'android', 'web'].includes(platform)) {
            return ctx.badRequest('platform doit être ios, android ou web');
        }
        try {
            // Upsert : si le token existe, mettre à jour, sinon créer
            const existing = await strapi.db.query('api::device-token.device-token').findOne({
                where: { token }
            });
            let deviceToken;
            if (existing) {
                deviceToken = await strapi.db.query('api::device-token.device-token').update({
                    where: { id: existing.id },
                    data: {
                        platform,
                        enabled: true,
                        last_seen: new Date()
                    }
                });
                // Mettre à jour la relation user si changée
                await strapi.db.connection.raw(`
          UPDATE device_tokens_user_lnk SET user_id = ? WHERE device_token_id = ?
        `, [userId, existing.id]);
            }
            else {
                deviceToken = await strapi.db.query('api::device-token.device-token').create({
                    data: {
                        token,
                        platform,
                        enabled: true,
                        last_seen: new Date()
                    }
                });
                // Créer la relation user
                await strapi.db.connection.raw(`
          INSERT INTO device_tokens_user_lnk (device_token_id, user_id) VALUES (?, ?)
        `, [deviceToken.id, userId]);
            }
            return { data: deviceToken };
        }
        catch (err) {
            console.error('❌ Erreur enregistrement device token:', err);
            return ctx.internalServerError('Erreur lors de l\'enregistrement du token');
        }
    },
    /**
     * POST /devices/unregister - Désactiver un token FCM
     */
    async unregister(ctx) {
        var _a;
        const userId = (_a = ctx.state.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return ctx.unauthorized('Authentification requise');
        }
        const { token } = ctx.request.body;
        if (!token) {
            return ctx.badRequest('token requis');
        }
        try {
            const existing = await strapi.db.query('api::device-token.device-token').findOne({
                where: { token, user_id: userId }
            });
            if (!existing) {
                return ctx.notFound('Token introuvable');
            }
            await strapi.entityService.update('api::device-token.device-token', existing.id, {
                data: { enabled: false }
            });
            return { data: { success: true } };
        }
        catch (err) {
            console.error('❌ Erreur désenregistrement device token:', err);
            return ctx.internalServerError('Erreur lors de la désactivation du token');
        }
    }
}));
