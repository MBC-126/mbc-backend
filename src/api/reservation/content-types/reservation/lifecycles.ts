/**
 * Lifecycle hooks pour les réservations
 * Envoie des notifications automatiquement lors des changements d'état
 */

export default {
  /**
   * Hook après création d'une réservation
   */
  async afterCreate(event: any) {
    const { result } = event;
    console.log('✅ Nouvelle réservation créée:', result.id);
    // La notification peut être envoyée plus tard quand elle est confirmée/rejetée
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
    } catch (error) {
      console.error('❌ Erreur dans le lifecycle hook afterUpdate (reservation):', error);
    }
  }
};
