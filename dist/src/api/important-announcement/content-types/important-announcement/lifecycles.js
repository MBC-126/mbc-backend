"use strict";
/**
 * Lifecycle hooks pour les annonces importantes
 * Envoie une notification broadcast lorsqu'une annonce "very high" est créée
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    async afterCreate(event) {
        const { result } = event;
        try {
            console.log('✅ Nouvelle annonce importante créée:', result.documentId);
            // Vérifier si la priorité est "very high"
            if (result.priority === 'very high') {
                console.log('📢 Annonce très importante détectée - envoi de notifications broadcast');
                // Tronquer le contenu si trop long (max 200 caractères pour la notification)
                const maxLength = 200;
                const body = result.content.length > maxLength
                    ? result.content.substring(0, maxLength) + '...'
                    : result.content;
                // Envoyer une notification broadcast à tous les utilisateurs
                const notificationResult = await strapi.service('api::notification.notification').broadcastNotification({
                    type: 'important_announcement',
                    title: `${result.icon || '📢'} ${result.title}`,
                    body: body,
                    priority: 'urgent',
                    relatedItemId: result.documentId,
                    relatedItemType: 'announcement',
                    data: {
                        announcementId: result.documentId,
                        announcementTitle: result.title
                    }
                });
                console.log(`✅ Notification broadcast envoyée: ${notificationResult.successful} succès, ${notificationResult.failed} échecs`);
            }
        }
        catch (error) {
            console.error('❌ Erreur dans le lifecycle hook afterCreate (important-announcement):', error);
        }
    }
};
