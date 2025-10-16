"use strict";
/**
 * Service Firebase Chat
 * Gère les conversations et messages en temps réel via Firestore
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirebaseChatService = void 0;
const firestore_1 = require("firebase-admin/firestore");
class FirebaseChatService {
    constructor(firebaseAdmin) {
        if (!firebaseAdmin) {
            throw new Error('Firebase Admin not initialized');
        }
        this.db = (0, firestore_1.getFirestore)(firebaseAdmin.app());
    }
    /**
     * Crée ou récupère une conversation existante
     */
    async createOrGetConversation(user1Id, user2Id, relatedItemId, relatedItemType, title) {
        try {
            // Trier les IDs pour avoir un ordre cohérent
            const participantIds = [user1Id, user2Id].sort((a, b) => a - b);
            // Générer un ID de conversation basé sur les participants et l'item lié
            const conversationId = relatedItemId
                ? `${relatedItemType}_${relatedItemId}_${participantIds.join('_')}`
                : `direct_${participantIds.join('_')}`;
            const conversationRef = this.db.collection('conversations').doc(conversationId);
            const conversationDoc = await conversationRef.get();
            // Si la conversation existe déjà, retourner son ID
            if (conversationDoc.exists) {
                console.log(`✅ Conversation existante: ${conversationId}`);
                return conversationId;
            }
            // Récupérer les données des participants depuis Strapi
            const user1 = await strapi.db.query('plugin::users-permissions.user').findOne({
                where: { id: user1Id },
                select: ['id', 'firstName', 'lastName', 'rank']
            });
            const user2 = await strapi.db.query('plugin::users-permissions.user').findOne({
                where: { id: user2Id },
                select: ['id', 'firstName', 'lastName', 'rank']
            });
            if (!user1 || !user2) {
                throw new Error('Utilisateurs introuvables');
            }
            // Créer la nouvelle conversation
            const conversationData = {
                participants: participantIds,
                participantsData: [
                    {
                        id: user1.id,
                        lastName: user1.lastName,
                        firstName: user1.firstName,
                        rank: user1.rank || ''
                    },
                    {
                        id: user2.id,
                        lastName: user2.lastName,
                        firstName: user2.firstName,
                        rank: user2.rank || ''
                    }
                ],
                title: title || `Conversation`,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                ...(relatedItemId && { relatedItemId }),
                ...(relatedItemType && { relatedItemType })
            };
            await conversationRef.set(conversationData);
            console.log(`✅ Nouvelle conversation créée: ${conversationId}`);
            return conversationId;
        }
        catch (error) {
            console.error('❌ Erreur createOrGetConversation:', error);
            throw error;
        }
    }
    /**
     * Envoie un message dans une conversation
     */
    async sendMessage(conversationId, senderId, text) {
        try {
            const conversationRef = this.db.collection('conversations').doc(conversationId);
            const conversationDoc = await conversationRef.get();
            if (!conversationDoc.exists) {
                throw new Error('Conversation introuvable');
            }
            // Récupérer les infos du sender
            const sender = await strapi.db.query('plugin::users-permissions.user').findOne({
                where: { id: senderId },
                select: ['id', 'firstName', 'lastName']
            });
            if (!sender) {
                throw new Error('Utilisateur introuvable');
            }
            const senderName = `${sender.firstName} ${sender.lastName}`;
            // Créer le message dans la subcollection
            const messageData = {
                senderId,
                senderName,
                text,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                read: false
            };
            const messagesRef = conversationRef.collection('messages');
            const messageRef = await messagesRef.add(messageData);
            // Mettre à jour la conversation avec le dernier message
            await conversationRef.update({
                lastMessage: text,
                lastMessageTime: firestore_1.FieldValue.serverTimestamp()
            });
            console.log(`✅ Message envoyé dans ${conversationId} par user ${senderId}`);
            // Envoyer notification push à l'autre participant
            const conversationData = conversationDoc.data();
            const recipientId = conversationData.participants.find((id) => id !== senderId);
            if (recipientId) {
                await this.sendMessageNotification(recipientId, senderName, text, conversationData.title);
            }
            return messageRef.id;
        }
        catch (error) {
            console.error('❌ Erreur sendMessage:', error);
            throw error;
        }
    }
    /**
     * Récupère les conversations d'un utilisateur
     */
    async getUserConversations(userId) {
        var _a, _b, _c, _d, _e, _f;
        try {
            const conversationsSnapshot = await this.db
                .collection('conversations')
                .where('participants', 'array-contains', userId)
                .orderBy('lastMessageTime', 'desc')
                .limit(50)
                .get();
            const conversations = [];
            for (const doc of conversationsSnapshot.docs) {
                const data = doc.data();
                // Compter les messages non lus
                const unreadSnapshot = await this.db
                    .collection('conversations')
                    .doc(doc.id)
                    .collection('messages')
                    .where('read', '==', false)
                    .where('senderId', '!=', userId)
                    .get();
                conversations.push({
                    id: doc.id,
                    ...data,
                    unreadCount: unreadSnapshot.size,
                    createdAt: ((_c = (_b = (_a = data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || null,
                    lastMessageTime: ((_f = (_e = (_d = data.lastMessageTime) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d)) === null || _f === void 0 ? void 0 : _f.toISOString()) || null
                });
            }
            return conversations;
        }
        catch (error) {
            console.error('❌ Erreur getUserConversations:', error);
            throw error;
        }
    }
    /**
     * Récupère les messages d'une conversation
     */
    async getMessages(conversationId, limit = 50) {
        try {
            const messagesSnapshot = await this.db
                .collection('conversations')
                .doc(conversationId)
                .collection('messages')
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();
            return messagesSnapshot.docs.map((doc) => {
                var _a, _b, _c;
                return ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: ((_c = (_b = (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate) === null || _b === void 0 ? void 0 : _b.call(_a)) === null || _c === void 0 ? void 0 : _c.toISOString()) || null
                });
            });
        }
        catch (error) {
            console.error('❌ Erreur getMessages:', error);
            throw error;
        }
    }
    /**
     * Marque les messages comme lus
     */
    async markMessagesAsRead(conversationId, userId) {
        try {
            const messagesSnapshot = await this.db
                .collection('conversations')
                .doc(conversationId)
                .collection('messages')
                .where('read', '==', false)
                .where('senderId', '!=', userId)
                .get();
            const batch = this.db.batch();
            messagesSnapshot.docs.forEach((doc) => {
                batch.update(doc.ref, { read: true });
            });
            await batch.commit();
            console.log(`✅ ${messagesSnapshot.size} messages marqués comme lus dans ${conversationId}`);
        }
        catch (error) {
            console.error('❌ Erreur markMessagesAsRead:', error);
            throw error;
        }
    }
    /**
     * Envoie une notification push pour un nouveau message
     */
    async sendMessageNotification(recipientId, senderName, messageText, conversationTitle) {
        try {
            await strapi.service('api::notification.notification').createNotification(recipientId, {
                type: 'carpool_message', // ou announcement_message selon le type
                title: `${senderName}`,
                body: messageText.length > 100 ? messageText.substring(0, 97) + '...' : messageText,
                priority: 'high',
                relatedItemType: 'conversation',
                data: { conversationTitle }
            });
        }
        catch (error) {
            console.error('❌ Erreur sendMessageNotification:', error);
            // Ne pas bloquer l'envoi du message si la notif échoue
        }
    }
}
exports.FirebaseChatService = FirebaseChatService;
exports.default = FirebaseChatService;
