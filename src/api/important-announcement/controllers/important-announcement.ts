import { factories } from '@strapi/strapi';

export default factories.createCoreController(
  'api::important-announcement.important-announcement' as any,
  ({ strapi }) => ({
    /**
     * Surcharge de la méthode find pour filtrer automatiquement
     * les annonces dont displayUntil est dépassé
     */
    async find(ctx) {
      // Filtrer les annonces de J à J+7
      const now = new Date();
      const nowISO = now.toISOString();

      // J+7 : 7 jours dans le futur
      const sevenDaysFromNow = new Date(now);
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      const sevenDaysFromNowISO = sevenDaysFromNow.toISOString();

      // Construire les filtres
      const baseFilters = [
        // Annonce active
        { isActive: { $eq: true } },

        // startDate : soit null (immédiat), soit entre maintenant et J+7
        {
          $or: [
            { startDate: { $null: true } },
            {
              $and: [
                { startDate: { $lte: sevenDaysFromNowISO } },  // Commence dans max 7 jours
                { startDate: { $gte: nowISO } }                 // Pas encore passée OU
              ]
            },
            { startDate: { $lte: nowISO } }  // OU déjà commencée
          ]
        },

        // displayUntil : soit null (permanent), soit dans le futur
        {
          $or: [
            { displayUntil: { $null: true } },
            { displayUntil: { $gte: nowISO } }
          ]
        }
      ];

      // Fusionner avec les filtres existants si présents
      ctx.query = ctx.query || {};
      ctx.query.filters = {
        $and: baseFilters
      };
      ctx.query.sort = { startDate: 'asc', priority: 'desc', publishedAt: 'desc' };

      // Appeler la méthode find par défaut avec les filtres modifiés
      const { data, meta } = await super.find(ctx);

      return { data, meta };
    },

    /**
     * Méthode custom pour récupérer les annonces expirées
     * (utile pour l'admin ou le cron de nettoyage)
     */
    async findExpired(ctx) {
      const now = new Date().toISOString();

      const entities = await strapi.entityService.findMany(
        'api::important-announcement.important-announcement',
        {
          filters: {
            $and: [
              { displayUntil: { $notNull: true } },
              { displayUntil: { $lt: now } }
            ]
          },
          sort: { displayUntil: 'asc' }
        }
      );

      return entities;
    }
  })
);
