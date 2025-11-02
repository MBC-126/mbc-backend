/**
 * Lifecycle hooks pour les annonces importantes
 * Logique intelligente de notifications:
 * - Si événement < 10 jours: notification immédiate (avec horaire intelligent 7h-21h)
 * - Si événement >= 10 jours: planifier notification à J-10 à 9h
 */

export default {
  async afterCreate(event: any) {
    const { result } = event;

    try {
      console.log('✅ Nouvelle annonce importante créée:', result.documentId);

      const { startDate, title, content, icon } = result;

      // Si pas de startDate, considérer comme immédiat (aujourd'hui)
      const eventDate = startDate ? new Date(startDate) : new Date();
      eventDate.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculer le nombre de jours jusqu'à l'événement
      const daysUntilEvent = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`📅 Important announcement créé: événement dans ${daysUntilEvent} jour(s)`);

      // Préparer le contenu de la notification
      const maxLength = 200;
      const body = content.length > maxLength
        ? content.substring(0, maxLength) + '...'
        : content;

      const notificationData = {
        type: 'important_announcement',
        title: `${icon || '📢'} ${title}`,
        body: body,
        priority: 'urgent' as const,
        relatedItemId: result.documentId,
        relatedItemType: 'announcement',
        data: {
          announcementId: result.documentId,
          announcementTitle: title
        }
      };

      // Cas 1: Événement dans < 10 jours → Notification avec horaire intelligent
      if (daysUntilEvent < 10) {
        const now = new Date();
        const currentHour = now.getHours();

        // Horaires intelligents: 7h-21h = immédiat, sinon différer à 9h lendemain
        if (currentHour >= 7 && currentHour < 21) {
          console.log('⏰ Horaire OK (7h-21h) → Envoi immédiat');

          // Envoyer broadcast immédiatement
          const notificationResult = await strapi
            .service('api::notification.notification')
            .broadcastNotification(notificationData);

          console.log(
            `✅ Notification broadcast envoyée: ${notificationResult.successful} succès, ${notificationResult.failed} échecs`
          );

          // Marquer comme envoyée
          await strapi.entityService.update(
            'api::important-announcement.important-announcement',
            result.id,
            {
              data: { notificationSent: true }
            }
          );
        } else {
          console.log('⏰ Hors horaires (21h-7h) → Différer à 9h demain');

          // Calculer 9h le lendemain
          const tomorrow9am = new Date();
          tomorrow9am.setDate(tomorrow9am.getDate() + 1);
          tomorrow9am.setHours(9, 0, 0, 0);

          // Planifier la notification
          await strapi.entityService.update(
            'api::important-announcement.important-announcement',
            result.id,
            {
              data: {
                notificationScheduledFor: tomorrow9am.toISOString(),
                notificationSent: false
              }
            }
          );

          console.log(`📆 Notification planifiée pour ${tomorrow9am.toISOString()}`);
        }
      }
      // Cas 2: Événement dans >= 10 jours → Planifier notification à J-10
      else {
        console.log('📆 Événement lointain → Notification à J-10');

        // Calculer J-10 à 9h
        const notifDate = new Date(eventDate);
        notifDate.setDate(notifDate.getDate() - 10); // J-10
        notifDate.setHours(9, 0, 0, 0); // 9h du matin

        // Planifier la notification
        await strapi.entityService.update(
          'api::important-announcement.important-announcement',
          result.id,
          {
            data: {
              notificationScheduledFor: notifDate.toISOString(),
              notificationSent: false
            }
          }
        );

        console.log(`📆 Notification planifiée pour J-10: ${notifDate.toISOString()}`);
      }
    } catch (error) {
      console.error(
        '❌ Erreur dans le lifecycle hook afterCreate (important-announcement):',
        error
      );
    }
  }
};
