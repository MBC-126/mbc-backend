/**
 * Lifecycle hooks pour Emergency Alert
 * Envoie une notification FCM instantanée à TOUS les users quand une alerte est créée
 */

export default {
  /**
   * Après création d'une Emergency Alert
   * Broadcast instantané FCM à tous les users
   */
  async afterCreate(event: any) {
    const { result } = event;
    const { title, message, severity, category, isActive } = result;

    // Ne pas envoyer si l'alerte n'est pas active
    if (!isActive) {
      console.log(`⚠️ Emergency Alert ${result.id} créée mais pas active, pas de notification envoyée`);
      return;
    }

    try {
      console.log(`🚨 Emergency Alert créée: ${title} (severity: ${severity})`);

      // Déterminer l'icône selon la catégorie
      const categoryIcons = {
        'sécurité': '🚨',
        'météo': '⛈️',
        'technique': '⚙️',
        'autre': '📢'
      };

      const icon = categoryIcons[category] || '🚨';

      // Déterminer la priorité de notification selon severity
      const priorityMap = {
        'low': 'normal' as const,
        'medium': 'high' as const,
        'high': 'urgent' as const,
        'critical': 'urgent' as const
      };

      const priority = priorityMap[severity] || 'urgent';

      // Préparer la notification
      const notificationData = {
        type: 'emergency_alert',
        title: `${icon} ALERTE: ${title}`,
        body: message,
        relatedItemId: result.id?.toString(),
        relatedItemType: 'emergency-alert',
        priority,
        data: {
          severity,
          category,
          requiresAcknowledgment: result.requiresAcknowledgment || false,
          expiresAt: result.expiresAt,
          targetUnits: result.targetUnits
        }
      };

      // Broadcast instantané FCM à TOUS les users
      const notificationService = strapi.service('api::notification.notification');
      await notificationService.broadcastNotification(notificationData);

      console.log(`✅ Emergency Alert broadcast envoyée instantanément à tous les users`);

    } catch (error: any) {
      console.error(`❌ Erreur lors de l'envoi du broadcast Emergency Alert:`, error);
      // Ne pas bloquer la création de l'alerte même si notification échoue
    }
  },

  /**
   * Après mise à jour d'une Emergency Alert
   * Si l'alerte devient active → broadcast
   */
  async afterUpdate(event: any) {
    const { result, params } = event;

    // Vérifier si isActive passe de false à true
    const wasInactive = params?.data?.isActive === false;
    const isNowActive = result.isActive === true;

    if (wasInactive && isNowActive) {
      console.log(`🚨 Emergency Alert ${result.id} activée via update`);

      // Même logique que afterCreate
      const { title, message, severity, category } = result;

      try {
        const categoryIcons = {
          'sécurité': '🚨',
          'météo': '⛈️',
          'technique': '⚙️',
          'autre': '📢'
        };

        const icon = categoryIcons[category] || '🚨';

        const priorityMap = {
          'low': 'normal' as const,
          'medium': 'high' as const,
          'high': 'urgent' as const,
          'critical': 'urgent' as const
        };

        const priority = priorityMap[severity] || 'urgent';

        const notificationData = {
          type: 'emergency_alert',
          title: `${icon} ALERTE: ${title}`,
          body: message,
          relatedItemId: result.id?.toString(),
          relatedItemType: 'emergency-alert',
          priority,
          data: {
            severity,
            category,
            requiresAcknowledgment: result.requiresAcknowledgment || false,
            expiresAt: result.expiresAt,
            targetUnits: result.targetUnits
          }
        };

        const notificationService = strapi.service('api::notification.notification');
        await notificationService.broadcastNotification(notificationData);

        console.log(`✅ Emergency Alert broadcast envoyée après activation`);

      } catch (error: any) {
        console.error(`❌ Erreur broadcast Emergency Alert (update):`, error);
      }
    }
  }
};
