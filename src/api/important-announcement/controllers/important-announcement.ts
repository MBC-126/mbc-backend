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
    },

    /**
     * Envoie les notifications planifiées (appelé par N8N via cron)
     * Trouve les annonces avec notificationScheduledFor <= maintenant
     * et notificationSent = false, puis envoie les notifications broadcast
     */
    async sendScheduledNotifications(ctx) {
      try {
        const now = new Date();
        console.log(`🔔 Vérification des notifications planifiées à ${now.toISOString()}`);

        // Trouver les annonces à notifier maintenant
        const announcements = await strapi.entityService.findMany(
          'api::important-announcement.important-announcement',
          {
            filters: {
              $and: [
                { notificationSent: false },
                { notificationScheduledFor: { $notNull: true } },
                { notificationScheduledFor: { $lte: now.toISOString() } }
              ]
            }
          }
        );

        console.log(`📬 ${announcements.length} notification(s) planifiée(s) à envoyer`);

        if (announcements.length === 0) {
          return ctx.send({
            success: true,
            sent: 0,
            message: 'Aucune notification à envoyer'
          });
        }

        let successCount = 0;
        let failedCount = 0;

        for (const announcement of announcements) {
          try {
            console.log(`📤 Envoi notification pour annonce ${announcement.documentId}: ${announcement.title}`);

            // Tronquer le contenu si trop long
            const maxLength = 200;
            const body = announcement.content.length > maxLength
              ? announcement.content.substring(0, maxLength) + '...'
              : announcement.content;

            // Envoyer broadcast
            const notificationResult = await strapi
              .service('api::notification.notification')
              .broadcastNotification({
                type: 'important_announcement',
                title: `${announcement.icon || '📢'} ${announcement.title}`,
                body: body,
                priority: 'urgent',
                relatedItemId: announcement.documentId,
                relatedItemType: 'announcement',
                data: {
                  announcementId: announcement.documentId,
                  announcementTitle: announcement.title
                }
              });

            console.log(
              `✅ Notification envoyée: ${notificationResult.successful} succès, ${notificationResult.failed} échecs`
            );

            // Marquer comme envoyée
            await strapi.entityService.update(
              'api::important-announcement.important-announcement',
              announcement.id,
              {
                data: { notificationSent: true }
              }
            );

            successCount++;
          } catch (error) {
            console.error(
              `❌ Erreur envoi notification pour annonce ${announcement.documentId}:`,
              error
            );
            failedCount++;
          }
        }

        console.log(`✅ Envoi terminé: ${successCount} succès, ${failedCount} échecs`);

        return ctx.send({
          success: true,
          sent: successCount,
          failed: failedCount,
          message: `${successCount} notification(s) envoyée(s), ${failedCount} échec(s)`
        });
      } catch (error) {
        console.error('❌ Erreur sendScheduledNotifications:', error);
        return ctx.badRequest('Erreur lors de l\'envoi des notifications planifiées');
      }
    }
  })
);
