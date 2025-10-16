/**
 * Service Firebase Chat
 * Gère les conversations et messages en temps réel via Firestore
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';

interface ConversationData {
  participants: number[]; // User IDs
  participantsData: {
    id: number;
    lastName: string;
    firstName: string;
    rank: string;
  }[];
  relatedItemId?: string;
  relatedItemType?: 'announcement' | 'carpool';
  title: string;
  lastMessage?: string;
  lastMessageTime?: any;
  createdAt: any;
}

interface MessageData {
  senderId: number;
  senderName: string;
  text: string;
  createdAt: any;
  read: boolean;
}

export class FirebaseChatService {
  private db: any;

  constructor(firebaseAdmin: any) {
    if (!firebaseAdmin) {
      throw new Error('Firebase Admin not initialized');
    }
    this.db = getFirestore(firebaseAdmin.app());
  }

  /**
   * Crée ou récupère une conversation existante
   */
  async createOrGetConversation(
    user1Id: number,
    user2Id: number,
    relatedItemId?: string,
    relatedItemType?: 'announcement' | 'carpool',
    title?: string
  ): Promise<string> {
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
      const conversationData: ConversationData = {
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
        createdAt: FieldValue.serverTimestamp(),
        ...(relatedItemId && { relatedItemId }),
        ...(relatedItemType && { relatedItemType })
      };

      await conversationRef.set(conversationData);
      console.log(`✅ Nouvelle conversation créée: ${conversationId}`);

      return conversationId;
    } catch (error) {
      console.error('❌ Erreur createOrGetConversation:', error);
      throw error;
    }
  }

  /**
   * Envoie un message dans une conversation
   */
  async sendMessage(
    conversationId: string,
    senderId: number,
    text: string
  ): Promise<string> {
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
      const messageData: MessageData = {
        senderId,
        senderName,
        text,
        createdAt: FieldValue.serverTimestamp(),
        read: false
      };

      const messagesRef = conversationRef.collection('messages');
      const messageRef = await messagesRef.add(messageData);

      // Mettre à jour la conversation avec le dernier message
      await conversationRef.update({
        lastMessage: text,
        lastMessageTime: FieldValue.serverTimestamp()
      });

      console.log(`✅ Message envoyé dans ${conversationId} par user ${senderId}`);

      // Envoyer notification push à l'autre participant
      const conversationData = conversationDoc.data();
      const recipientId = conversationData.participants.find((id: number) => id !== senderId);

      if (recipientId) {
        await this.sendMessageNotification(recipientId, senderName, text, conversationData.title);
      }

      return messageRef.id;
    } catch (error) {
      console.error('❌ Erreur sendMessage:', error);
      throw error;
    }
  }

  /**
   * Récupère les conversations d'un utilisateur
   */
  async getUserConversations(userId: number): Promise<any[]> {
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
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          lastMessageTime: data.lastMessageTime?.toDate?.()?.toISOString() || null
        });
      }

      return conversations;
    } catch (error) {
      console.error('❌ Erreur getUserConversations:', error);
      throw error;
    }
  }

  /**
   * Récupère les messages d'une conversation
   */
  async getMessages(conversationId: string, limit: number = 50): Promise<any[]> {
    try {
      const messagesSnapshot = await this.db
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return messagesSnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
      }));
    } catch (error) {
      console.error('❌ Erreur getMessages:', error);
      throw error;
    }
  }

  /**
   * Marque les messages comme lus
   */
  async markMessagesAsRead(conversationId: string, userId: number): Promise<void> {
    try {
      const messagesSnapshot = await this.db
        .collection('conversations')
        .doc(conversationId)
        .collection('messages')
        .where('read', '==', false)
        .where('senderId', '!=', userId)
        .get();

      const batch = this.db.batch();

      messagesSnapshot.docs.forEach((doc: any) => {
        batch.update(doc.ref, { read: true });
      });

      await batch.commit();
      console.log(`✅ ${messagesSnapshot.size} messages marqués comme lus dans ${conversationId}`);
    } catch (error) {
      console.error('❌ Erreur markMessagesAsRead:', error);
      throw error;
    }
  }

  /**
   * Envoie une notification push pour un nouveau message
   */
  private async sendMessageNotification(
    recipientId: number,
    senderName: string,
    messageText: string,
    conversationTitle: string
  ): Promise<void> {
    try {
      await strapi.service('api::notification.notification').createNotification(recipientId, {
        type: 'carpool_message', // ou announcement_message selon le type
        title: `${senderName}`,
        body: messageText.length > 100 ? messageText.substring(0, 97) + '...' : messageText,
        priority: 'high',
        relatedItemType: 'conversation',
        data: { conversationTitle }
      });
    } catch (error) {
      console.error('❌ Erreur sendMessageNotification:', error);
      // Ne pas bloquer l'envoi du message si la notif échoue
    }
  }
}

export default FirebaseChatService;
