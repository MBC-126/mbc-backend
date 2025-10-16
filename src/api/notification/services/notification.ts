import { factories } from '@strapi/strapi';

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
        select: ['id', 'fcmToken', 'notificationPreferences']
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

      // Envoyer la push notification si token présent
      if (user.fcmToken) {
        await this.sendPushNotification(user.fcmToken, notification);
      } else {
        console.log(`⚠️ Pas de token FCM pour user ${userId} - Push notification non envoyée`);
      }

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
      'emergency_alert': 'emergencyAlerts'
    };

    return mapping[type] || null;
  },

  /**
   * Envoie une push notification via Firebase Cloud Messaging
   */
  async sendPushNotification(fcmToken: string, notification: any) {
    try {
      // Vérifier si Firebase Admin est configuré
      const admin = strapi.firebaseAdmin;
      if (!admin) {
        console.warn('⚠️ Firebase Admin SDK non configuré - Push notification non envoyée');
        return false;
      }

      const message = {
        notification: {
          title: notification.title,
          body: notification.body || ''
        },
        data: {
          notificationId: notification.id.toString(),
          type: notification.type,
          relatedItemId: notification.relatedItemId || '',
          relatedItemType: notification.relatedItemType || '',
          actionUrl: notification.actionUrl || ''
        },
        token: fcmToken,
        android: {
          priority: this.getAndroidPriority(notification.priority),
          notification: {
            channelId: 'default',
            sound: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await admin.messaging().send(message);
      console.log(`📲 Push notification envoyée: ${response}`);
      return true;

    } catch (error: any) {
      console.error('❌ Erreur sendPushNotification:', error);

      // Si le token est invalide, le supprimer
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        console.log(`🗑️ Token FCM invalide, suppression...`);
        // Chercher l'utilisateur avec ce token et le supprimer
        const users = await strapi.db.query('plugin::users-permissions.user').findMany({
          where: { fcmToken }
        });

        for (const user of users) {
          await strapi.db.query('plugin::users-permissions.user').update({
            where: { id: user.id },
            data: { fcmToken: null }
          });
        }
      }

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

      // Créer une notification pour chaque utilisateur
      const userIds = users.map(u => u.id);
      return await this.createNotificationForUsers(userIds, notificationData);

    } catch (error) {
      console.error('❌ Erreur broadcastNotification:', error);
      return { successful: 0, failed: 0 };
    }
  }

}));
