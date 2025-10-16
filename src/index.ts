// import type { Core } from '@strapi/strapi';
import { initializeFirebase } from './services/firebase';
import { startAllCronJobs } from './services/cron';
import imageProcessor from './services/image-processor';
import { registerN8nRoutes } from './utils/n8n-routes';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: any }) {
    // Hook pour optimiser et générer les formats d'images automatiquement
    strapi.db.lifecycles.subscribe({
      models: ['plugin::upload.file'],

      async afterCreate(event: any) {
        const { result } = event;

        // Vérifier si c'est une image
        if (result?.mime?.startsWith('image/')) {
          console.log(`✅ Nouvelle image uploadée: ${result.name}`);
          // Les formats sont générés automatiquement par Strapi avec Sharp
          // grâce à la configuration breakpoints dans plugins.ts
        }
      },
    });

    // Register explicit n8n helper routes (API Token protected)
    registerN8nRoutes(strapi, [
      {
        method: 'GET',
        path: '/api/carpools/to-remind',
        handler: async (ctx: any) => {
          // Call the existing controller method
          // @ts-ignore
          const ctrl = (strapi as any).controller('api::carpool.n8n');
          return await ctrl.toRemind(ctx);
        },
      },
      {
        method: 'POST',
        path: '/api/carpools/:id/mark-reminder-sent',
        handler: async (ctx: any) => {
          // @ts-ignore
          const ctrl = (strapi as any).controller('api::carpool.n8n');
          return await ctrl.markReminderSent(ctx);
        },
      },
      {
        method: 'DELETE',
        path: '/api/carpools/cleanup',
        handler: async (ctx: any) => {
          // @ts-ignore
          const ctrl = (strapi as any).controller('api::carpool.n8n');
          return await ctrl.cleanup(ctx);
        },
      }
    ]);

    // Register missing explicit routes for reservations and announcements (n8n helpers)
    registerN8nRoutes(strapi, [
      {
        method: 'GET',
        path: '/api/reservations/tomorrow',
        handler: async (ctx: any) => {
          // @ts-ignore
          const ctrl = (strapi as any).controller('api::reservation.reservation');
          return await ctrl.findTomorrow(ctx);
        },
      },
      {
        method: 'GET',
        path: '/api/announcements/expiring',
        handler: async (ctx: any) => {
          // @ts-ignore
          const ctrl = (strapi as any).controller('api::announcement.announcement');
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
  bootstrap({ strapi }: { strapi: any }) {
    // Initialiser Firebase Admin SDK
    const firebaseAdmin = initializeFirebase();

    // Rendre Firebase Admin accessible globalement dans Strapi
    strapi.firebaseAdmin = firebaseAdmin;

    // Démarrer tous les cron jobs
    startAllCronJobs(strapi);

    console.log('🚀 Strapi bootstrap completed');
  },
};
