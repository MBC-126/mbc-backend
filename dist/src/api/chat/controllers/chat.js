"use strict";
/**
 * Chat controller
 * Gère les conversations et messages via Firebase Firestore
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const firebaseChat_1 = __importDefault(require("../../../services/firebaseChat"));
const getFirebaseAdmin = () => strapi.firebaseAdmin;
exports.default = {
    /**
     * Crée ou récupère une conversation
     * POST /api/chat/conversations
     * Body: { otherUserId, relatedItemId?, relatedItemType?, title? }
     */
    async createConversation(ctx) {
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Vous devez être connecté');
        }
        const { otherUserId, relatedItemId, relatedItemType, title } = ctx.request.body;
        if (!otherUserId) {
            return ctx.badRequest('otherUserId est requis');
        }
        try {
            const chatService = new firebaseChat_1.default(getFirebaseAdmin());
            const conversationId = await chatService.createOrGetConversation(user.id, parseInt(otherUserId), relatedItemId, relatedItemType, title);
            return ctx.send({
                conversationId,
                message: 'Conversation créée ou récupérée avec succès'
            });
        }
        catch (error) {
            console.error('❌ Erreur createConversation:', error);
            return ctx.internalServerError(error.message);
        }
    },
    /**
     * Récupère les conversations de l'utilisateur
     * GET /api/chat/conversations
     */
    async getConversations(ctx) {
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Vous devez être connecté');
        }
        try {
            const chatService = new firebaseChat_1.default(getFirebaseAdmin());
            const conversations = await chatService.getUserConversations(user.id);
            return ctx.send(conversations);
        }
        catch (error) {
            console.error('❌ Erreur getConversations:', error);
            return ctx.internalServerError(error.message);
        }
    },
    /**
     * Récupère les messages d'une conversation
     * GET /api/chat/conversations/:id/messages
     */
    async getMessages(ctx) {
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Vous devez être connecté');
        }
        const { id: conversationId } = ctx.params;
        const { limit = 50 } = ctx.query;
        try {
            const chatService = new firebaseChat_1.default(getFirebaseAdmin());
            const messages = await chatService.getMessages(conversationId, parseInt(limit));
            return ctx.send(messages);
        }
        catch (error) {
            console.error('❌ Erreur getMessages:', error);
            return ctx.internalServerError(error.message);
        }
    },
    /**
     * Envoie un message
     * POST /api/chat/conversations/:id/messages
     * Body: { text }
     */
    async sendMessage(ctx) {
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
            const chatService = new firebaseChat_1.default(getFirebaseAdmin());
            const messageId = await chatService.sendMessage(conversationId, user.id, text);
            return ctx.send({
                messageId,
                message: 'Message envoyé avec succès'
            });
        }
        catch (error) {
            console.error('❌ Erreur sendMessage:', error);
            return ctx.internalServerError(error.message);
        }
    },
    /**
     * Marque les messages comme lus
     * PUT /api/chat/conversations/:id/read
     */
    async markAsRead(ctx) {
        const user = ctx.state.user;
        if (!user) {
            return ctx.unauthorized('Vous devez être connecté');
        }
        const { id: conversationId } = ctx.params;
        try {
            const chatService = new firebaseChat_1.default(getFirebaseAdmin());
            await chatService.markMessagesAsRead(conversationId, user.id);
            return ctx.send({
                message: 'Messages marqués comme lus'
            });
        }
        catch (error) {
            console.error('❌ Erreur markAsRead:', error);
            return ctx.internalServerError(error.message);
        }
    }
};
