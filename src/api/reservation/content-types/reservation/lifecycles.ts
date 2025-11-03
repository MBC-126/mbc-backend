/**
 * Lifecycle hooks pour les réservations
 * Envoie des notifications automatiquement lors des changements d'état
 */

export default {
  /**
   * Hook avant de récupérer des réservations
   * Rejette automatiquement les demandes en attente expirées (startTime + 1 min passé)
   */
  async beforeFindMany(event: any) {
    try {
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60000); // 1 minute dans le passé

      // Trouver toutes les réservations pending dont startTime + 1 min est dépassé
      const expiredReservations = await strapi.db.query('api::reservation.reservation').findMany({
        where: {
          etatReservation: 'pending',
          startTime: { $lt: oneMinuteAgo }
        },
        populate: ['user', 'infrastructure']
      });

      if (expiredReservations.length > 0) {
        console.log(`⏰ ${expiredReservations.length} réservation(s) expirée(s) trouvée(s), auto-rejet en cours...`);

        // Rejeter chaque réservation expirée
        for (const reservation of expiredReservations) {
          await strapi.db.query('api::reservation.reservation').update({
            where: { id: reservation.id },
            data: {
              etatReservation: 'rejected',
              rejection_reason: 'Demande expirée - Non traitée dans les délais (startTime + 1 min dépassé)'
            }
          });

          // Notifier l'utilisateur
          if (reservation.user) {
            const infraName = reservation.infrastructure?.name || 'Infrastructure';
            const startTime = new Date(reservation.startTime).toLocaleString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit'
            });

            await strapi.service('api::notification.notification').createNotification(
              reservation.user.id,
              {
                type: 'reservation_rejected',
                title: 'Réservation expirée ⏰',
                body: `Votre demande pour ${infraName} le ${startTime} a expiré (non traitée à temps).`,
                priority: 'normal',
                relatedItemId: reservation.id.toString(),
                relatedItemType: 'reservation'
              }
            );
          }

          console.log(`✅ Réservation ${reservation.id} auto-rejetée (expirée)`);
        }
      }
    } catch (error) {
      console.error('❌ Erreur beforeFindMany (auto-rejet réservations expirées):', error);
      // Ne pas bloquer la requête même si l'auto-rejet échoue
    }
  },

  /**
   * Hook avant de récupérer une réservation
   * Même logique que beforeFindMany
   */
  async beforeFindOne(event: any) {
    // Utiliser la même logique que beforeFindMany
    await this.beforeFindMany(event);
  },

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
        console.log(`🚫 Réservation ${result.id} annulée - envoi notification instantanée à user ${userId}`);

        await strapi.service('api::notification.notification').createNotification(userId, {
          type: 'reservation_cancelled',
          title: 'Réservation annulée 🚫',
          body: `Votre réservation pour ${infraName} le ${startTime} a été annulée.`,
          priority: 'normal',
          relatedItemId: result.id.toString(),
          relatedItemType: 'reservation'
        });
      }
    } catch (error) {
      console.error('❌ Erreur dans le lifecycle hook afterUpdate (reservation):', error);
    }
  }
};
