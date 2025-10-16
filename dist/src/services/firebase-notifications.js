"use strict";
// /src/services/firebase-notifications.ts
Object.defineProperty(exports, "__esModule", { value: true });
// C'est la structure d'un service Strapi.
// Strapi injectera l'objet 'strapi' pour nous.
exports.default = ({ strapi }) => ({
    /**
     * Envoie une notification push à un utilisateur unique.
     * @param {string} userId - L'ID de l'utilisateur dans Strapi.
     * @param {NotificationPayload} notification - Le contenu de la notification.
     */
    async sendNotificationToUser(userId, notification) {
        // On demande au système de configuration de Strapi de nous donner le service 'messaging'.
        // On le fait ICI, à l'intérieur de la fonction, au moment de l'exécution.
        const messaging = strapi.config.get('firebase.messaging');
        // On vérifie que le service est bien disponible avant de continuer.
        if (!messaging) {
            console.warn('⚠️ Le service de messagerie Firebase n\'est pas initialisé. La notification n\'a pas été envoyée.');
            return null;
        }
        try {
            // Le reste de votre logique est parfait, on le garde tel quel.
            const user = await strapi.db.query('plugin::users-permissions.user').findOne({
                where: { id: userId },
                select: ['fcmToken'], // Assurez-vous d'avoir ajouté ce champ au Content-Type "User" !
            });
            if (!(user === null || user === void 0 ? void 0 : user.fcmToken)) {
                console.log(`Pas de FCM token pour l'utilisateur ${userId}`);
                return null;
            }
            const message = {
                token: user.fcmToken,
                notification: {
                    title: notification.title,
                    body: notification.body,
                },
                data: notification.data || {},
            };
            const response = await messaging.send(message);
            console.log('✅ Notification envoyée:', response);
            return response;
        }
        catch (error) {
            console.error('❌ Erreur lors de l\'envoi de la notification:', error);
            // On ne propage pas l'erreur pour ne pas faire planter l'appelant
            return { success: false, error: error.message };
        }
    },
    /**
     * Envoie une notification push à plusieurs utilisateurs.
     * @param {string[]} userIds - Un tableau d'IDs utilisateurs.
     * @param {NotificationPayload} notification - Le contenu de la notification.
     */
    async sendNotificationToMultipleUsers(userIds, notification) {
        // On appelle notre propre service, c'est plus propre.
        // 'this' fait référence à l'objet service lui-même.
        const promises = userIds.map(userId => this.sendNotificationToUser(userId, notification));
        return Promise.allSettled(promises);
    },
});
