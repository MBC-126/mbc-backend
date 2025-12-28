import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::notification.notification' as any, ({ strapi }: any) => ({

  /**
   * Récupère les notifications de l'utilisateur connecté
   */
  async find(ctx: any) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('Vous devez être connecté');
    }

    const { read, type, limit = 30 } = ctx.query;

    const filters: any = {
      user: user.id
    };

    if (read !== undefined) {
      filters.read = read === 'true';
    }

    if (type) {
      filters.type = type;
    }

    // Limite sécurisée pour éviter DoS (max 100)
    const safeLimit = Math.min(Math.max(1, parseInt(limit) || 50), 100);

    const notifications = await strapi.db.query('api::notification.notification').findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
      limit: safeLimit,
      populate: ['user']
    });

    return notifications;
  },

  /**
   * Marque une notification comme lue
   */
  async markAsRead(ctx: any) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('Vous devez être connecté');
    }

    const { id } = ctx.params;

    const notification = await strapi.db.query('api::notification.notification').findOne({
      where: { id, user: user.id }
    });

    if (!notification) {
      return ctx.notFound('Notification introuvable');
    }

    const updated = await strapi.db.query('api::notification.notification').update({
      where: { id },
      data: { read: true }
    });

    return updated;
  },

  /**
   * Marque toutes les notifications comme lues
   */
  async markAllAsRead(ctx: any) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('Vous devez être connecté');
    }

    // Récupérer toutes les notifications non lues
    const unreadNotifications = await strapi.db.query('api::notification.notification').findMany({
      where: { user: user.id, read: false }
    });

    // Marquer chaque notification comme lue
    for (const notification of unreadNotifications) {
      await strapi.db.query('api::notification.notification').update({
        where: { id: notification.id },
        data: { read: true }
      });
    }

    return { message: 'Toutes les notifications ont été marquées comme lues', count: unreadNotifications.length };
  },

  /**
   * Supprime une notification
   */
  async delete(ctx: any) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('Vous devez être connecté');
    }

    const { id } = ctx.params;

    const notification = await strapi.db.query('api::notification.notification').findOne({
      where: { id, user: user.id }
    });

    if (!notification) {
      return ctx.notFound('Notification introuvable');
    }

    await strapi.db.query('api::notification.notification').delete({
      where: { id }
    });

    return { message: 'Notification supprimée' };
  },

  /**
   * Compte les notifications non lues
   */
  async getUnreadCount(ctx: any) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('Vous devez être connecté');
    }

    const count = await strapi.db.query('api::notification.notification').count({
      where: { user: user.id, read: false }
    });

    return { count };
  },

  /**
   * Envoyer une notification push à un utilisateur (pour n8n)
   */
  async sendPush(ctx: any) {
    try {
      const { userId, title, body, data } = ctx.request.body;

      if (!userId || !title || !body) {
        return ctx.badRequest('userId, title, body sont requis');
      }

      const result = await strapi.service('api::firebase-notifications').sendNotificationToUser(
        userId,
        { title, body, data }
      );

      ctx.body = { success: true, result };
    } catch (err) {
      console.error('❌ Erreur sendPush:', err);
      ctx.throw(500, err);
    }
  },

  /**
   * Nettoyer les notifications de plus de 30 jours (pour n8n)
   */
  async cleanup(ctx: any) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deletedNotifications = await strapi.db.query('api::notification.notification').deleteMany({
        where: {
          createdAt: {
            $lt: thirtyDaysAgo.toISOString()
          }
        }
      });

      console.log(`🗑️ Nettoyage notifications : ${deletedNotifications?.count || 0} supprimées`);

      ctx.body = {
        success: true,
        deleted: deletedNotifications?.count || 0,
        message: `${deletedNotifications?.count || 0} notifications supprimées`
      };
    } catch (err) {
      console.error('❌ Erreur cleanup notifications:', err);
      ctx.throw(500, err);
    }
  },

  /**
   * Envoie une notification à tous les utilisateurs (broadcast)
   * Réservé aux administrateurs
   */
  async broadcast(ctx: any) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('Vous devez être connecté');
    }

    // Vérifier que l'utilisateur est admin
    const userWithRole = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { id: user.id },
      populate: ['role']
    });

    if (!userWithRole || userWithRole.role?.type !== 'admin') {
      return ctx.forbidden('Seuls les administrateurs peuvent envoyer des notifications broadcast');
    }

    const { type, title, body, priority, relatedItemId, relatedItemType, actionUrl, data } = ctx.request.body;

    if (!type || !title) {
      return ctx.badRequest('Les champs type et title sont requis');
    }

    const result = await strapi.service('api::notification.notification').broadcastNotification({
      type,
      title,
      body,
      priority: priority || 'normal',
      relatedItemId,
      relatedItemType,
      actionUrl,
      data
    });

    return {
      message: 'Notification broadcast envoyée',
      successful: result.successful,
      failed: result.failed
    };
  }
}));
