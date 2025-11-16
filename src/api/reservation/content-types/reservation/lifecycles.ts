/**
 * Lifecycle hooks pour les réservations
 * Envoie des notifications automatiquement lors des changements d'état
 */

export default {
  /**
   * Hook après création d'une réservation
   * Envoie notification INSTANTANÉE aux managers de l'infrastructure
   */
  async afterCreate(event: any) {
    const { result } = event;
    console.log('✅ Nouvelle réservation créée:', result.id);

    try {
      // Récupérer la réservation complète avec relations
      const reservation = await strapi.db.query('api::reservation.reservation').findOne({
        where: { id: result.id },
        populate: ['user', 'infrastructure', 'infrastructure.managers']
      });

      if (!reservation || !reservation.infrastructure) {
        console.error('❌ Réservation ou infrastructure introuvable:', result.id);
        return;
      }

      const infraName = reservation.infrastructure.name || 'Infrastructure';
      const userName = reservation.user?.username || 'Un utilisateur';
      const startTime = new Date(reservation.startTime).toLocaleString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Notifier TOUS les managers de l'infrastructure (instantané)
      const managers = reservation.infrastructure.managers || [];

      if (managers.length > 0) {
        console.log(`📬 Envoi notification instantanée à ${managers.length} manager(s) pour nouvelle réservation`);

        const managerIds = managers.map(m => m.id);

        await strapi.service('api::notification.notification').createNotificationForUsers(
          managerIds,
          {
            type: 'reservation_request',
            title: '📅 Nouvelle demande de réservation',
            body: `${userName} demande à réserver ${infraName} le ${startTime}`,
            priority: 'high',
            relatedItemId: result.id.toString(),
            relatedItemType: 'reservation',
            data: {
              reservationId: result.id,
              infrastructureName: infraName,
              userName: userName,
              startTime: reservation.startTime
            }
          }
        );

        console.log(`✅ Notifications envoyées instantanément aux managers`);
      } else {
        console.log(`⚠️ Aucun manager pour infrastructure ${reservation.infrastructure.id}`);
      }

    } catch (error) {
      console.error('❌ Erreur dans afterCreate (reservation):', error);
    }
  },

  /**
   * Hook après mise à jour d'une réservation
   */
  async afterUpdate(event: any) {
    const { result, params } = event;

    try {
      // Récupérer la réservation complète avec ses relations
      const reservation = await strapi.db.query('api::reservation.reservation').findOne({
        where: { id: result.id },
        populate: ['user', 'infrastructure']
      });

      if (!reservation || !reservation.user) {
        console.error('❌ Réservation ou utilisateur introuvable:', result.id);
        return;
      }

      const userId = reservation.user.id;
      const infraName = reservation.infrastructure?.name || 'Infrastructure';
      const startTime = new Date(reservation.startTime).toLocaleString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Vérifier si le statut a changé
      const newStatus = reservation.etatReservation;

      // Notification si confirmée
      if (newStatus === 'confirmed') {
        console.log(`📅 Réservation ${result.id} confirmée - envoi notification à user ${userId}`);

        await strapi.service('api::notification.notification').createNotification(userId, {
          type: 'reservation_confirmed',
          title: 'Réservation confirmée ✅',
          body: `Votre réservation pour ${infraName} le ${startTime} a été confirmée.`,
          priority: 'high',
          relatedItemId: result.id.toString(),
          relatedItemType: 'reservation'
        });
      }

      // Notification si rejetée
      if (newStatus === 'rejected') {
        console.log(`❌ Réservation ${result.id} rejetée - envoi notification à user ${userId}`);

        await strapi.service('api::notification.notification').createNotification(userId, {
          type: 'reservation_rejected',
          title: 'Réservation refusée ❌',
          body: `Votre réservation pour ${infraName} le ${startTime} a été refusée.`,
          priority: 'normal',
          relatedItemId: result.id.toString(),
          relatedItemType: 'reservation'
        });
      }

      // Notification INSTANTANÉE si annulée
      if (newStatus === 'cancelled') {
        console.log(`🚫 Réservation ${result.id} annulée - envoi notifications`);

        // Notifier l'utilisateur
        await strapi.service('api::notification.notification').createNotification(userId, {
          type: 'reservation_cancelled',
          title: 'Réservation annulée 🚫',
          body: `Votre réservation pour ${infraName} le ${startTime} a été annulée.`,
          priority: 'normal',
          relatedItemId: result.id.toString(),
          relatedItemType: 'reservation'
        });

        // Notifier également les managers de l'infrastructure
        const infraWithManagers = await strapi.db.query('api::infrastructure.infrastructure').findOne({
          where: { id: reservation.infrastructure.id },
          populate: ['managers']
        });

        if (infraWithManagers?.managers && infraWithManagers.managers.length > 0) {
          const managerIds = infraWithManagers.managers.map((m: any) => m.id);
          const userName = reservation.user?.firstName
            ? `${reservation.user.firstName} ${reservation.user.lastName || ''}`.trim()
            : reservation.user?.username || 'Un utilisateur';

          await strapi.service('api::notification.notification').createNotificationForUsers(
            managerIds,
            {
              type: 'reservation_cancelled_manager',
              title: '🚫 Réservation annulée',
              body: `${userName} a annulé sa réservation de ${infraName} le ${startTime}`,
              priority: 'normal',
              relatedItemId: result.id.toString(),
              relatedItemType: 'reservation',
              data: {
                reservationId: result.id,
                infrastructureName: infraName,
                userName: userName,
                startTime: reservation.startTime
              }
            }
          );

          console.log(`✅ Managers notifiés de l'annulation`);
        }
      }
    } catch (error) {
      console.error('❌ Erreur dans le lifecycle hook afterUpdate (reservation):', error);
    }
  }
};
