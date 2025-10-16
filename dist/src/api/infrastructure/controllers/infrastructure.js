"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const strapi_1 = require("@strapi/strapi");
exports.default = strapi_1.factories.createCoreController('api::infrastructure.infrastructure', ({ strapi }) => ({
    /**
     * Ajouter une période d'indisponibilité (blackout)
     * Manager only
     */
    async addBlackout(ctx) {
        const user = ctx.state.user;
        console.log('📅 addBlackout appelé par user:', user === null || user === void 0 ? void 0 : user.id);
        if (!user) {
            return ctx.unauthorized('Vous devez être connecté');
        }
        const { id } = ctx.params;
        const { start_at, end_at, reason } = ctx.request.body;
        console.log('📅 addBlackout params:', { id, start_at, end_at, reason });
        if (!start_at || !end_at || !reason) {
            return ctx.badRequest('Paramètres manquants: start_at, end_at, reason');
        }
        // Vérifier que end > start
        if (new Date(end_at) <= new Date(start_at)) {
            return ctx.badRequest('La date de fin doit être après la date de début');
        }
        try {
            // Vérifier que l'infrastructure existe
            const infrastructure = await strapi.db.query('api::infrastructure.infrastructure').findOne({
                where: { id: parseInt(id, 10) }
            });
            if (!infrastructure) {
                console.error(`❌ Infrastructure ${id} introuvable`);
                return ctx.notFound('Infrastructure introuvable');
            }
            console.log('✅ Infrastructure trouvée:', infrastructure.id);
            // Créer le blackout
            const blackout = await strapi.db.query('api::infrastructure-blackout.infrastructure-blackout').create({
                data: {
                    infrastructure: infrastructure.id,
                    start_at,
                    end_at,
                    reason
                }
            });
            console.log(`✅ Blackout créé pour infrastructure ${id}:`, blackout);
            return ctx.send({ data: blackout });
        }
        catch (error) {
            console.error('❌ Erreur création blackout:', error);
            console.error('❌ Stack:', error.stack);
            return ctx.internalServerError('Erreur lors de la création du blackout');
        }
    },
    /**
     * Récupérer les blackouts d'une infrastructure
     * Public (pour que tous puissent voir les indisponibilités)
     */
    async getBlackouts(ctx) {
        const { id } = ctx.params;
        try {
            console.log(`🔍 getBlackouts pour infrastructure ${id}`);
            // Déterminer si c'est un documentId (string long) ou un id (numérique)
            let infrastructureId;
            if (isNaN(parseInt(id, 10)) || id.length > 10) {
                // C'est un documentId, on doit récupérer l'id numérique
                console.log(`🔍 Recherche par documentId: ${id}`);
                const infrastructure = await strapi.db.query('api::infrastructure.infrastructure').findOne({
                    where: { documentId: id }
                });
                if (!infrastructure) {
                    console.error(`❌ Infrastructure avec documentId ${id} introuvable`);
                    return ctx.notFound('Infrastructure introuvable');
                }
                infrastructureId = infrastructure.id;
                console.log(`✅ Infrastructure trouvée, id numérique: ${infrastructureId}`);
            }
            else {
                // C'est déjà un id numérique
                infrastructureId = parseInt(id, 10);
            }
            const blackouts = await strapi.db.query('api::infrastructure-blackout.infrastructure-blackout').findMany({
                where: { infrastructure: infrastructureId },
                orderBy: { start_at: 'asc' }
            });
            console.log(`✅ ${blackouts.length} blackout(s) trouvé(s) pour infrastructure ${id} (id: ${infrastructureId})`);
            return ctx.send({ data: blackouts });
        }
        catch (error) {
            console.error('❌ Erreur getBlackouts:', error);
            return ctx.internalServerError('Erreur lors de la récupération des blackouts');
        }
    },
    /**
     * Exporter le calendrier ICS
     * Public avec token
     */
    async calendarICS(ctx) {
        const { id } = ctx.params;
        const { token } = ctx.query;
        if (!token) {
            return ctx.badRequest('Token manquant');
        }
        // Récupérer l'infrastructure
        const infrastructure = await strapi.db.query('api::infrastructure.infrastructure').findOne({
            where: { id, icsToken: token }
        });
        if (!infrastructure) {
            return ctx.notFound('Infrastructure introuvable ou token invalide');
        }
        // Récupérer toutes les réservations confirmées
        const reservations = await strapi.db.query('api::reservation.reservation').findMany({
            where: {
                infrastructure: id,
                etatReservation: 'confirmed',
                startTime: { $gte: new Date().toISOString() }
            },
            populate: ['user']
        });
        // Générer le fichier ICS
        const { generateICS } = require('../../../services/ics-generator');
        const icsContent = generateICS(infrastructure, reservations);
        // Calculer ETag
        const crypto = require('crypto');
        const etag = crypto.createHash('md5').update(icsContent).digest('hex');
        // Vérifier If-None-Match
        if (ctx.request.headers['if-none-match'] === etag) {
            return ctx.status = 304; // Not Modified
        }
        ctx.set('Content-Type', 'text/calendar; charset=utf-8');
        ctx.set('Content-Disposition', `attachment; filename="${infrastructure.name}.ics"`);
        ctx.set('ETag', etag);
        ctx.set('Cache-Control', 'private, max-age=3600');
        ctx.body = icsContent;
    },
    /**
     * Supprimer une période d'indisponibilité (blackout)
     * Manager only
     */
    async deleteBlackout(ctx) {
        const user = ctx.state.user;
        console.log('🗑️ deleteBlackout appelé par user:', user === null || user === void 0 ? void 0 : user.id);
        if (!user) {
            return ctx.unauthorized('Vous devez être connecté');
        }
        const { id, blackoutId } = ctx.params;
        console.log('🗑️ deleteBlackout params:', { id, blackoutId });
        try {
            // Convertir documentId en id numérique si nécessaire
            let infrastructureId = id;
            if (isNaN(parseInt(id, 10))) {
                console.log('🔍 Recherche par documentId:', id);
                const infra = await strapi.db.query('api::infrastructure.infrastructure').findOne({
                    where: { documentId: id }
                });
                if (!infra) {
                    console.error(`❌ Infrastructure avec documentId ${id} introuvable`);
                    return ctx.notFound('Infrastructure introuvable');
                }
                infrastructureId = infra.id;
                console.log('✅ Infrastructure trouvée, id numérique:', infrastructureId);
            }
            // Vérifier que l'infrastructure existe
            const infrastructure = await strapi.db.query('api::infrastructure.infrastructure').findOne({
                where: { id: parseInt(infrastructureId, 10) }
            });
            if (!infrastructure) {
                console.error(`❌ Infrastructure ${id} introuvable`);
                return ctx.notFound('Infrastructure introuvable');
            }
            // Vérifier que le blackout existe et appartient à cette infrastructure
            const blackout = await strapi.db.query('api::infrastructure-blackout.infrastructure-blackout').findOne({
                where: {
                    id: parseInt(blackoutId, 10),
                    infrastructure: parseInt(infrastructureId, 10)
                }
            });
            if (!blackout) {
                console.error(`❌ Blackout ${blackoutId} introuvable pour infrastructure ${id}`);
                return ctx.notFound('Période d\'indisponibilité introuvable');
            }
            // Supprimer le blackout
            await strapi.db.query('api::infrastructure-blackout.infrastructure-blackout').delete({
                where: { id: parseInt(blackoutId, 10) }
            });
            console.log(`✅ Blackout ${blackoutId} supprimé pour infrastructure ${infrastructureId}`);
            return ctx.send({ data: { message: 'Période d\'indisponibilité supprimée' } });
        }
        catch (error) {
            console.error('❌ Erreur deleteBlackout:', error);
            return ctx.internalServerError('Erreur lors de la suppression');
        }
    },
    /**
     * Régénérer le token ICS
     * Manager only
     */
    async regenICSToken(ctx) {
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Vous devez être connecté');
        }
        const { id } = ctx.params;
        // Générer nouveau token
        const crypto = require('crypto');
        const newToken = crypto.randomUUID();
        // Mettre à jour
        await strapi.db.query('api::infrastructure.infrastructure').update({
            where: { id },
            data: { icsToken: newToken }
        });
        console.log(`✅ Token ICS régénéré pour infrastructure ${id}`);
        return ctx.send({ data: { icsToken: newToken } });
    }
}));
