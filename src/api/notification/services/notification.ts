import { factories } from '@strapi/strapi';
import { getFCMService } from '../../../services/fcm';

export default factories.createCoreService('api::notification.notification' as any, ({ strapi }: any) => ({

  /**
   * Crée une notification et l'envoie via Firebase si l'utilisateur a activé les push
   */
  async createNotification(userId: number, data: {
    type: string;
    title: string;
    body?: string;
    relatedItemId?: string;
    relatedItemType?: string;
    actionUrl?: string;
    data?: any;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  }) {
    try {
      // Récupérer l'utilisateur et ses préférences
      const user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { id: userId },
        select: ['id', 'notificationPreferences']
      });

      if (!user) {
        console.error(`User ${userId} not found`);
        return null;
      }

      // Vérifier les préférences de notification
      const prefs = user.notificationPreferences || {};
      const preferenceKey = this.getPreferenceKeyForType(data.type);

      // Si les notifications sont complètement désactivées
      if (prefs.enabled === false) {
        console.log(`Notifications disabled for user ${userId}`);
        return null;
      }

      // Si la catégorie spécifique est désactivée, ne pas créer
      if (preferenceKey && prefs[preferenceKey] === false) {
        console.log(`Notification category ${preferenceKey} disabled for user ${userId}`);
        return null;
      }

      // Créer la notification dans la base de données
      const notification = await strapi.db.query('api::notification.notification').create({
        data: {
          user: userId,
          type: data.type,
          title: data.title,
          body: data.body,
          relatedItemId: data.relatedItemId,
          relatedItemType: data.relatedItemType,
          actionUrl: data.actionUrl,
          data: data.data,
          priority: data.priority || 'normal',
          read: false
        }
      });

      console.log(`✅ Notification créée: ${notification.id} pour user ${userId}`);

      // Envoyer la push notification (nouveau système device_tokens)
      await this.sendPushNotification(userId, notification);

      return notification;
    } catch (error) {
      console.error('Erreur createNotification:', error);
      return null;
    }
  },

  /**
   * Retourne la clé de préférence correspondant au type de notification
   */
  getPreferenceKeyForType(type: string): string | null {
    const mapping: Record<string, string> = {
      'announcement_expiring': 'announcements',
      'announcement_message': 'announcements',
      'carpool_message': 'carpooling',
      'carpool_reminder': 'carpooling',
      'reservation_confirmed': 'reservations',
      'reservation_rejected': 'reservations',
      'reservation_reminder': 'reservations',
      'menu_available': 'announcements',
      'emergency_alert': 'emergencyAlerts',
      'important_announcement': 'announcements',
      'new_announcement': 'announcements',
      'new_carpool': 'carpooling'
    };

    return mapping[type] || null;
  },

  /**
   * Envoie une push notification via FCMService (utilise device_tokens)
   */
  async sendPushNotification(userId: number, notification: any) {
    try {
      // Récupérer tous les tokens actifs du user
      const deviceTokens = await strapi.db.query('api::device-token.device-token').findMany({
        where: {
          user: { id: userId },
          enabled: true
        }
      });

      if (!deviceTokens || deviceTokens.length === 0) {
        console.log(`⚠️ Aucun device token actif pour user ${userId} - Push notification non envoyée`);
        return false;
      }

      console.log(`📱 ${deviceTokens.length} device token(s) trouvé(s) pour user ${userId}`);

      let badgeCount: number | undefined;
      try {
        badgeCount = await strapi.db.query('api::notification.notification').count({
          where: { user: userId, read: false }
        });
      } catch (error) {
        console.warn(`⚠️ Impossible de calculer le badge pour user ${userId}:`, error);
      }

      const tokens = deviceTokens.map(dt => dt.token);
      const fcmService = getFCMService();

      // Préparer le payload
      const payload = {
        title: notification.title,
        body: notification.body || '',
        badge: badgeCount,
        data: {
          notificationId: notification.id.toString(),
          type: notification.type,
          relatedItemId: notification.relatedItemId || '',
          relatedItemType: notification.relatedItemType || '',
          actionUrl: notification.actionUrl || '',
          priority: notification.priority || 'normal'
        }
      };

      // Envoyer via FCMService (gère automatiquement Expo + FCM natif)
      await fcmService.sendPushToTokens(tokens, payload);

      console.log(`✅ Push notification envoyée à ${tokens.length} device(s) pour user ${userId}`);
      return true;

    } catch (error: any) {
      console.error('❌ Erreur sendPushNotification:', error);
      return false;
    }
  },

  /**
   * Convertit la priorité en priorité Android
   */
  getAndroidPriority(priority: string): 'high' | 'normal' {
    return (priority === 'high' || priority === 'urgent') ? 'high' : 'normal';
  },

  /**
   * Envoie une notification à plusieurs utilisateurs
   */
  async createNotificationForUsers(userIds: number[], notificationData: any) {
    const promises = userIds.map(userId =>
      this.createNotification(userId, notificationData)
    );

    const results = await Promise.allSettled(promises);

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`📊 Notifications envoyées: ${successful} succès, ${failed} échecs`);

    return { successful, failed };
  },

  /**
   * Envoie une notification à TOUS les utilisateurs (broadcast)
   * Respecte les préférences de chaque utilisateur
   */
  async broadcastNotification(notificationData: {
    type: string;
    title: string;
    body?: string;
    relatedItemId?: string;
    relatedItemType?: string;
    actionUrl?: string;
    data?: any;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
  }) {
    try {
      // Récupérer tous les utilisateurs
      const users = await strapi.db.query('plugin::users-permissions.user').findMany({
        select: ['id']
      });

      console.log(`📢 Broadcast notification à ${users.length} utilisateurs`);

      // Créer une notification pour chaque utilisateur (respecte les préférences)
      const userIds = users.map(u => u.id);
      const result = await this.createNotificationForUsers(userIds, notificationData);

      console.log(`✅ Broadcast terminé: ${result.successful} succès, ${result.failed} échecs`);

      return result;

    } catch (error) {
      console.error('❌ Erreur broadcastNotification:', error);
      return { successful: 0, failed: 0 };
    }
  }

}));
