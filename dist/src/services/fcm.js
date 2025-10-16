"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFCMService = exports.FCMService = void 0;
const google_auth_library_1 = require("google-auth-library");
/**
 * Service pour envoyer des notifications push via Firebase Cloud Messaging (HTTP v1)
 * ou Expo Push Notification Service
 */
class FCMService {
    constructor() {
        var _a;
        this.projectId = process.env.FIREBASE_PROJECT_ID;
        this.auth = new google_auth_library_1.GoogleAuth({
            credentials: {
                client_email: process.env.FIREBASE_CLIENT_EMAIL,
                private_key: (_a = process.env.FIREBASE_PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, '\n')
            },
            scopes: ['https://www.googleapis.com/auth/firebase.messaging']
        });
    }
    /**
     * Détecter si un token est un Expo Push Token
     */
    isExpoToken(token) {
        return token.startsWith('ExponentPushToken[');
    }
    /**
     * Envoyer une notification à plusieurs tokens
     * Détecte automatiquement si c'est un token Expo ou FCM
     */
    async sendPushToTokens(tokens, payload) {
        if (!tokens || tokens.length === 0) {
            console.log('⚠️ Push: Aucun token à notifier');
            return;
        }
        // Séparer les tokens Expo et FCM
        const expoTokens = tokens.filter(t => this.isExpoToken(t));
        const fcmTokens = tokens.filter(t => !this.isExpoToken(t));
        console.log(`📊 Push: ${expoTokens.length} Expo, ${fcmTokens.length} FCM tokens`);
        // Envoyer via les deux services en parallèle
        const results = await Promise.allSettled([
            expoTokens.length > 0 ? this.sendToExpo(expoTokens, payload) : Promise.resolve(),
            fcmTokens.length > 0 ? this.sendToFCM(fcmTokens, payload) : Promise.resolve()
        ]);
        const [expoResult, fcmResult] = results;
        if (expoResult.status === 'rejected') {
            console.error('❌ Expo Push error:', expoResult.reason);
        }
        if (fcmResult.status === 'rejected') {
            console.error('❌ FCM error:', fcmResult.reason);
        }
    }
    /**
     * Envoyer via Expo Push Notification Service
     */
    async sendToExpo(tokens, payload) {
        var _a;
        const messages = tokens.map(token => {
            var _a;
            return ({
                to: token,
                title: payload.title,
                body: payload.body,
                data: payload.data || {},
                sound: 'default',
                priority: 'high',
                channelId: ((_a = payload.data) === null || _a === void 0 ? void 0 : _a.type) === 'urgent' ? 'urgent' : 'default'
            });
        });
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(messages)
        });
        if (!response.ok) {
            const error = await response.json();
            console.error('❌ Expo Push error:', error);
            throw new Error(`Expo Push failed: ${error.message || 'Unknown error'}`);
        }
        const result = await response.json();
        // Gérer les erreurs individuelles
        (_a = result.data) === null || _a === void 0 ? void 0 : _a.forEach((res, index) => {
            var _a;
            if (res.status === 'error') {
                console.warn(`⚠️ Expo: Token ${tokens[index].slice(0, 20)}... erreur: ${res.message}`);
                // Si DeviceNotRegistered, désactiver le token
                if (((_a = res.details) === null || _a === void 0 ? void 0 : _a.error) === 'DeviceNotRegistered') {
                    this.disableToken(tokens[index]);
                }
            }
            else {
                console.log(`✅ Expo: Push envoyé à ${tokens[index].slice(0, 20)}...`);
            }
        });
    }
    /**
     * Envoyer via Firebase Cloud Messaging
     */
    async sendToFCM(tokens, payload) {
        const accessToken = await this.auth.getAccessToken();
        const endpoint = `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`;
        const results = await Promise.allSettled(tokens.map(async (token) => {
            var _a, _b, _c;
            const message = {
                message: {
                    token,
                    notification: {
                        title: payload.title,
                        body: payload.body
                    },
                    data: payload.data || {},
                    apns: {
                        headers: {
                            'apns-collapse-id': payload.collapseKey || 'default'
                        }
                    },
                    android: {
                        collapse_key: payload.collapseKey || 'default'
                    }
                }
            };
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(message)
            });
            if (!response.ok) {
                const error = await response.json();
                // Si token invalide (UNREGISTERED), désactiver le token
                if (((_a = error.error) === null || _a === void 0 ? void 0 : _a.status) === 'NOT_FOUND' || ((_b = error.error) === null || _b === void 0 ? void 0 : _b.status) === 'UNREGISTERED') {
                    await this.disableToken(token);
                    console.warn(`⚠️ FCM: Token ${token.slice(0, 10)}... invalide, désactivé`);
                }
                else {
                    console.error('❌ FCM error:', error);
                }
                throw new Error(`FCM send failed: ${(_c = error.error) === null || _c === void 0 ? void 0 : _c.message}`);
            }
            console.log(`✅ FCM: Push envoyé à ${token.slice(0, 10)}...`);
        }));
        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        console.log(`📊 FCM: ${succeeded} réussis, ${failed} échoués sur ${tokens.length} tokens`);
    }
    /**
     * Désactiver un token invalide
     */
    async disableToken(token) {
        try {
            await strapi.db.query('api::device-token.device-token').update({
                where: { token },
                data: { enabled: false }
            });
        }
        catch (err) {
            console.error('❌ Erreur désactivation token:', err);
        }
    }
}
exports.FCMService = FCMService;
// Singleton
let fcmService = null;
function getFCMService() {
    if (!fcmService) {
        fcmService = new FCMService();
    }
    return fcmService;
}
exports.getFCMService = getFCMService;
