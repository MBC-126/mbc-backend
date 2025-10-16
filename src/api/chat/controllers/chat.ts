/**
 * Chat controller
 * Gère les conversations et messages via Firebase Firestore
 */

import FirebaseChatService from '../../../services/firebaseChat';

// Type helper pour accéder à firebaseAdmin
interface StrapiWithFirebase {
  firebaseAdmin: any;
}

const getFirebaseAdmin = () => (strapi as unknown as StrapiWithFirebase).firebaseAdmin;

export default {
  /**
   * Crée ou récupère une conversation
   * POST /api/chat/conversations
   * Body: { otherUserId, relatedItemId?, relatedItemType?, title? }
   */
  async createConversation(ctx: any) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('Vous devez être connecté');
    }

    const { otherUserId, relatedItemId, relatedItemType, title } = ctx.request.body;

    if (!otherUserId) {
      return ctx.badRequest('otherUserId est requis');
    }

    try {
      const chatService = new FirebaseChatService(getFirebaseAdmin());

      const conversationId = await chatService.createOrGetConversation(
        user.id,
        parseInt(otherUserId),
        relatedItemId,
        relatedItemType,
        title
      );

      return ctx.send({
        conversationId,
        message: 'Conversation créée ou récupérée avec succès'
      });
    } catch (error: any) {
      console.error('❌ Erreur createConversation:', error);
      return ctx.internalServerError(error.message);
    }
  },

  /**
   * Récupère les conversations de l'utilisateur
   * GET /api/chat/conversations
   */
  async getConversations(ctx: any) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('Vous devez être connecté');
    }

    try {
      const chatService = new FirebaseChatService(getFirebaseAdmin());
      const conversations = await chatService.getUserConversations(user.id);

      return ctx.send(conversations);
    } catch (error: any) {
      console.error('❌ Erreur getConversations:', error);
      return ctx.internalServerError(error.message);
    }
  },

  /**
   * Récupère les messages d'une conversation
   * GET /api/chat/conversations/:id/messages
   */
  async getMessages(ctx: any) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('Vous devez être connecté');
    }

    const { id: conversationId } = ctx.params;
    const { limit = 50 } = ctx.query;

    try {
      const chatService = new FirebaseChatService(getFirebaseAdmin());
      const messages = await chatService.getMessages(conversationId, parseInt(limit));

      return ctx.send(messages);
    } catch (error: any) {
      console.error('❌ Erreur getMessages:', error);
      return ctx.internalServerError(error.message);
    }
  },

  /**
   * Envoie un message
   * POST /api/chat/conversations/:id/messages
   * Body: { text }
   */
  async sendMessage(ctx: any) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('Vous devez être connecté');
    }

    const { id: conversationId } = ctx.params;
    const { text } = ctx.request.body;

    if (!text || text.trim() === '') {
      return ctx.badRequest('Le message ne peut pas être vide');
    }

    try {
      const chatService = new FirebaseChatService(getFirebaseAdmin());
      const messageId = await chatService.sendMessage(conversationId, user.id, text);

      return ctx.send({
        messageId,
        message: 'Message envoyé avec succès'
      });
    } catch (error: any) {
      console.error('❌ Erreur sendMessage:', error);
      return ctx.internalServerError(error.message);
    }
  },

  /**
   * Marque les messages comme lus
   * PUT /api/chat/conversations/:id/read
   */
  async markAsRead(ctx: any) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('Vous devez être connecté');
    }

    const { id: conversationId } = ctx.params;

    try {
      const chatService = new FirebaseChatService(getFirebaseAdmin());
      await chatService.markMessagesAsRead(conversationId, user.id);

      return ctx.send({
        message: 'Messages marqués comme lus'
      });
    } catch (error: any) {
      console.error('❌ Erreur markAsRead:', error);
      return ctx.internalServerError(error.message);
    }
  }
};
