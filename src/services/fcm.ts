import { GoogleAuth } from 'google-auth-library';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  collapseKey?: string;
  badge?: number;
}

/**
 * Service pour envoyer des notifications push via Firebase Cloud Messaging (HTTP v1)
 * ou Expo Push Notification Service
 */
export class FCMService {
  private auth: GoogleAuth;
  private projectId: string;

  constructor() {
    this.projectId = process.env.FIREBASE_PROJECT_ID!;

    this.auth = new GoogleAuth({
      credentials: {
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      },
      scopes: ['https://www.googleapis.com/auth/firebase.messaging']
    });
  }

  /**
   * Détecter si un token est un Expo Push Token
   */
  private isExpoToken(token: string): boolean {
    return token.startsWith('ExponentPushToken[');
  }

  /**
   * Envoyer une notification à plusieurs tokens
   * Détecte automatiquement si c'est un token Expo ou FCM
   */
  async sendPushToTokens(tokens: string[], payload: PushPayload): Promise<void> {
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
  private async sendToExpo(tokens: string[], payload: PushPayload): Promise<void> {
    const messages = tokens.map(token => ({
      to: token,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
      sound: 'default',
      priority: 'high',
      channelId: payload.data?.type === 'urgent' ? 'urgent' : 'default',
      ...(typeof payload.badge === 'number' ? { badge: payload.badge } : {})
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messages)
    });

    if (!response.ok) {
      const error: any = await response.json();
      console.error('❌ Expo Push error:', error);
      throw new Error(`Expo Push failed: ${error.message || 'Unknown error'}`);
    }

    const result: any = await response.json();

    // Gérer les erreurs individuelles
    result.data?.forEach((res: any, index: number) => {
      if (res.status === 'error') {
        console.warn(`⚠️ Expo: Token ${tokens[index].slice(0, 20)}... erreur: ${res.message}`);

        // Si DeviceNotRegistered, désactiver le token
        if (res.details?.error === 'DeviceNotRegistered') {
          this.disableToken(tokens[index]);
        }
      } else {
        console.log(`✅ Expo: Push envoyé à ${tokens[index].slice(0, 20)}...`);
      }
    });
  }

  /**
   * Envoyer via Firebase Cloud Messaging
   */
  private async sendToFCM(tokens: string[], payload: PushPayload): Promise<void> {
    const accessToken = await this.auth.getAccessToken();
    const endpoint = `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`;

    const results = await Promise.allSettled(
      tokens.map(async (token) => {
        const apns: any = {
          headers: {
            'apns-collapse-id': payload.collapseKey || 'default'
          }
        };

        if (typeof payload.badge === 'number') {
          apns.payload = {
            aps: {
              badge: payload.badge
            }
          };
        }

        const message = {
          message: {
            token,
            notification: {
              title: payload.title,
              body: payload.body
            },
            data: payload.data || {},
            apns,
            android: {
              collapse_key: payload.collapseKey || 'default',
              notification: {
                channel_id: payload.data?.priority === 'urgent' ? 'urgent' : 'default'
              }
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
          const error: any = await response.json();

          // Si token invalide (UNREGISTERED), désactiver le token
          if (error.error?.status === 'NOT_FOUND' || error.error?.status === 'UNREGISTERED') {
            await this.disableToken(token);
            console.warn(`⚠️ FCM: Token ${token.slice(0, 10)}... invalide, désactivé`);
          } else {
            console.error('❌ FCM error:', error);
          }

          throw new Error(`FCM send failed: ${error.error?.message}`);
        }

        console.log(`✅ FCM: Push envoyé à ${token.slice(0, 10)}...`);
      })
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`📊 FCM: ${succeeded} réussis, ${failed} échoués sur ${tokens.length} tokens`);
  }

  /**
   * Désactiver un token invalide
   */
  private async disableToken(token: string): Promise<void> {
    try {
      await strapi.db.query('api::device-token.device-token').update({
        where: { token },
        data: { enabled: false }
      });
    } catch (err) {
      console.error('❌ Erreur désactivation token:', err);
    }
  }
}

// Singleton
let fcmService: FCMService | null = null;

export function getFCMService(): FCMService {
  if (!fcmService) {
    fcmService = new FCMService();
  }
  return fcmService;
}
