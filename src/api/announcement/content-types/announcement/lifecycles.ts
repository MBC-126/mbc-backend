/**
 * Lifecycle hooks pour les annonces
 * Envoie des notifications automatiquement lors des changements
 */

export default {
  async beforeCreate(event: any) {
    const { params } = event;

    // Récupérer l'utilisateur du contexte si disponible
    if (!params.data.seller && event.state?.user) {
      params.data.seller = event.state.user.documentId;
      console.log('🔧 Lifecycle: Seller ajouté automatiquement:', event.state.user.documentId);
    }
  },

  async afterCreate(event: any) {
    const { result } = event;
    console.log('✅ Nouvelle annonce créée:', result.documentId);
  },

  async afterUpdate(event: any) {
    const { result } = event;

    try {
      // Récupérer l'annonce complète avec ses relations
      const announcement = await strapi.db.query('api::announcement.announcement').findOne({
        where: { documentId: result.documentId },
        populate: ['seller', 'soldTo']
      });

      if (!announcement) {
        console.error('❌ Annonce introuvable:', result.documentId);
        return;
      }

      // Notification si l'annonce est vendue
      if (result.etat === 'vendue' && announcement.soldTo) {
        console.log(`✅ Annonce vendue à:`, announcement.soldTo.id);

        const buyerId = announcement.soldTo.id;
        const sellerId = announcement.seller?.id;

        // Notification à l'acheteur
        if (buyerId) {
          await strapi.service('api::notification.notification').createNotification(buyerId, {
            type: 'announcement_message',
            title: 'Annonce vendue',
            body: `L'annonce "${announcement.title}" vous a été vendue !`,
            priority: 'normal',
            relatedItemId: announcement.documentId,
            relatedItemType: 'announcement'
          });
        }

        // Notification au vendeur
        if (sellerId && sellerId !== buyerId) {
          await strapi.service('api::notification.notification').createNotification(sellerId, {
            type: 'announcement_message',
            title: 'Annonce vendue',
            body: `Votre annonce "${announcement.title}" a été vendue !`,
            priority: 'normal',
            relatedItemId: announcement.documentId,
            relatedItemType: 'announcement'
          });
        }
      }

      // Notification si l'annonce expire
      if (result.etat === 'expiree' && announcement.seller) {
        console.log(`⏰ Annonce expirée:`, result.documentId);

        const sellerId = announcement.seller.id;

        if (sellerId) {
          await strapi.service('api::notification.notification').createNotification(sellerId, {
            type: 'announcement_expiring',
            title: 'Annonce expirée',
            body: `Votre annonce "${announcement.title}" a expiré et n'est plus visible.`,
            priority: 'low',
            relatedItemId: announcement.documentId,
            relatedItemType: 'announcement'
          });
        }
      }

      // Notification INSTANTANÉE si l'annonce est supprimée (status 'supprimée')
      if (result.etat === 'supprimée' && announcement.seller) {
        console.log(`🗑️ Annonce supprimée:`, result.documentId);

        const sellerId = announcement.seller.id;

        if (sellerId) {
          await strapi.service('api::notification.notification').createNotification(sellerId, {
            type: 'announcement_deleted',
            title: 'Annonce supprimée',
            body: `Votre annonce "${announcement.title}" a été supprimée.`,
            priority: 'normal',
            relatedItemId: announcement.documentId,
            relatedItemType: 'announcement'
          });
        }
      }

      // Notification INSTANTANÉE si l'annonce est rejetée par modération
      if (result.reportStatus === 'rejected' && announcement.seller) {
        console.log(`🚫 Annonce rejetée par modération:`, result.documentId);

        const sellerId = announcement.seller.id;

        if (sellerId) {
          await strapi.service('api::notification.notification').createNotification(sellerId, {
            type: 'announcement_moderated',
            title: 'Annonce rejetée',
            body: `Votre annonce "${announcement.title}" a été rejetée par la modération.`,
            priority: 'high',
            relatedItemId: announcement.documentId,
            relatedItemType: 'announcement'
          });
        }
      }

    } catch (error) {
      console.error('❌ Erreur dans le lifecycle hook afterUpdate (announcement):', error);
    }
  },

  /**
   * Après suppression d'une annonce
   * Notifie INSTANTANÉMENT le vendeur
   */
  async afterDelete(event: any) {
    const { result } = event;

    try {
      console.log(`🗑️ Annonce ${result.documentId} supprimée définitivement`);

      // Récupérer le vendeur
      if (result.seller) {
        const sellerId = typeof result.seller === 'object' ? result.seller.id : result.seller;

        if (sellerId) {
          await strapi.service('api::notification.notification').createNotification(sellerId, {
            type: 'announcement_deleted',
            title: 'Annonce supprimée',
            body: `Votre annonce "${result.title || 'Sans titre'}" a été supprimée.`,
            priority: 'normal',
            relatedItemId: result.documentId,
            relatedItemType: 'announcement'
          });

          console.log(`✅ Vendeur ${sellerId} notifié instantanément de la suppression`);
        }
      }

    } catch (error) {
      console.error('❌ Erreur afterDelete announcement:', error);
    }
  }
};
