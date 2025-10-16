"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import type { Core } from '@strapi/strapi';
const firebase_1 = require("./services/firebase");
const cron_1 = require("./services/cron");
const n8n_routes_1 = require("./utils/n8n-routes");
exports.default = {
    /**
     * An asynchronous register function that runs before
     * your application is initialized.
     *
     * This gives you an opportunity to extend code.
     */
    register({ strapi }) {
        // Hook pour optimiser et générer les formats d'images automatiquement
        strapi.db.lifecycles.subscribe({
            models: ['plugin::upload.file'],
            async afterCreate(event) {
                var _a;
                const { result } = event;
                // Vérifier si c'est une image
                if ((_a = result === null || result === void 0 ? void 0 : result.mime) === null || _a === void 0 ? void 0 : _a.startsWith('image/')) {
                    console.log(`✅ Nouvelle image uploadée: ${result.name}`);
                    // Les formats sont générés automatiquement par Strapi avec Sharp
                    // grâce à la configuration breakpoints dans plugins.ts
                }
            },
        });
        // Register explicit n8n helper routes (API Token protected)
        (0, n8n_routes_1.registerN8nRoutes)(strapi, [
            {
                method: 'GET',
                path: '/api/carpools/to-remind',
                handler: async (ctx) => {
                    // Call the existing controller method
                    // @ts-ignore
                    const ctrl = strapi.controller('api::carpool.n8n');
                    return await ctrl.toRemind(ctx);
                },
            },
            {
                method: 'POST',
                path: '/api/carpools/:id/mark-reminder-sent',
                handler: async (ctx) => {
                    // @ts-ignore
                    const ctrl = strapi.controller('api::carpool.n8n');
                    return await ctrl.markReminderSent(ctx);
                },
            },
            {
                method: 'DELETE',
                path: '/api/carpools/cleanup',
                handler: async (ctx) => {
                    // @ts-ignore
                    const ctrl = strapi.controller('api::carpool.n8n');
                    return await ctrl.cleanup(ctx);
                },
            }
        ]);
        // Register missing explicit routes for reservations and announcements (n8n helpers)
        (0, n8n_routes_1.registerN8nRoutes)(strapi, [
            {
                method: 'GET',
                path: '/api/reservations/tomorrow',
                handler: async (ctx) => {
                    // @ts-ignore
                    const ctrl = strapi.controller('api::reservation.reservation');
                    return await ctrl.findTomorrow(ctx);
                },
            },
            {
                method: 'GET',
                path: '/api/announcements/expiring',
                handler: async (ctx) => {
                    // @ts-ignore
                    const ctrl = strapi.controller('api::announcement.announcement');
                    return await ctrl.findExpiring(ctx);
                },
            }
        ]);
        console.log('Custom n8n routes registered');
        console.log('✅ Image optimization hooks registered');
    },
    /**
     * An asynchronous bootstrap function that runs before
     * your application gets started.
     *
     * This gives you an opportunity to set up your data model,
     * run jobs, or perform some special logic.
     */
    bootstrap({ strapi }) {
        // Initialiser Firebase Admin SDK
        const firebaseAdmin = (0, firebase_1.initializeFirebase)();
        // Rendre Firebase Admin accessible globalement dans Strapi
        strapi.firebaseAdmin = firebaseAdmin;
        // Démarrer tous les cron jobs
        (0, cron_1.startAllCronJobs)(strapi);
        console.log('🚀 Strapi bootstrap completed');
    },
};
