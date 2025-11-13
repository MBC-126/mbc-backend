import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::device-token.device-token', ({ strapi }) => ({
  /**
   * POST /devices/register - Enregistrer un token FCM
   */
  async register(ctx: any) {
    const userId = ctx.state.user?.id;

    if (!userId) {
      return ctx.unauthorized('Authentification requise');
    }

    const { token, platform } = ctx.request.body;

    if (!token || !platform) {
      return ctx.badRequest('token et platform sont requis');
    }

    if (!['ios', 'android', 'web'].includes(platform)) {
      return ctx.badRequest('platform doit être ios, android ou web');
    }

    try {
      // Upsert : si le token existe, mettre à jour, sinon créer
      const existing = await strapi.db.query('api::device-token.device-token').findOne({
        where: { token }
      });

      let deviceToken;

      if (existing) {
        deviceToken = await strapi.db.query('api::device-token.device-token').update({
          where: { id: existing.id },
          data: {
            platform,
            enabled: true,
            last_seen: new Date()
          }
        });

        // Mettre à jour la relation user si changée
        await strapi.db.connection.raw(`
          UPDATE device_tokens_user_lnk SET user_id = ? WHERE device_token_id = ?
        `, [userId, existing.id]);
      } else {
        deviceToken = await strapi.db.query('api::device-token.device-token').create({
          data: {
            token,
            platform,
            enabled: true,
            last_seen: new Date()
          }
        });

        // Créer la relation user
        await strapi.db.connection.raw(`
          INSERT INTO device_tokens_user_lnk (device_token_id, user_id) VALUES (?, ?)
        `, [deviceToken.id, userId]);
      }

      // AUSSI enregistrer dans user.fcmToken pour compatibilité avec le système de notifications
      await strapi.db.query('plugin::users-permissions.user').update({
        where: { id: userId },
        data: { fcmToken: token }
      });

      console.log(`✅ Token FCM enregistré pour user ${userId} (device-token + user.fcmToken)`);

      return { data: deviceToken };
    } catch (err: any) {
      console.error('❌ Erreur enregistrement device token:', err);
      return ctx.internalServerError('Erreur lors de l\'enregistrement du token');
    }
  },

  /**
   * POST /devices/unregister - Désactiver un token FCM
   */
  async unregister(ctx: any) {
    const userId = ctx.state.user?.id;

    if (!userId) {
      return ctx.unauthorized('Authentification requise');
    }

    const { token } = ctx.request.body;

    if (!token) {
      return ctx.badRequest('token requis');
    }

    try {
      const existing = await strapi.db.query('api::device-token.device-token').findOne({
        where: { token, user: { id: userId } }
      });

      if (!existing) {
        return ctx.notFound('Token introuvable');
      }

      await strapi.entityService.update('api::device-token.device-token', existing.id, {
        data: { enabled: false }
      });

      return { data: { success: true } };
    } catch (err: any) {
      console.error('❌ Erreur désenregistrement device token:', err);
      return ctx.internalServerError('Erreur lors de la désactivation du token');
    }
  }
}));
