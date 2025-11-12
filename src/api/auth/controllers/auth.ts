import axios from 'axios';
import jwt from 'jsonwebtoken';

// Build ProConnect base URL from env; fallback to integ01 for dev
const envDomain = process.env.PROCONNECT_DOMAIN || 'fca.integ01.dev-agentconnect.fr';
const PROCONNECT_BASE_URL = envDomain.startsWith('http') ? envDomain : `https://${envDomain}`;

export default ({ strapi }) => ({
  async test(ctx) {
    return { message: 'OK, API custom en TypeScript bien chargée !' };
  },

  async proconnectLogin(ctx) {
    const { id_token, access_token } = ctx.request.body as {
      id_token: string;
      access_token: string;
    };

    if (!id_token) {
      return ctx.badRequest('Le paramètre "id_token" est manquant.');
    }

    if (!access_token) {
      return ctx.badRequest('Le paramètre "access_token" est manquant.');
    }

    try {
      // 1. Valider l'id_token
      // @ts-ignore
      const decodedToken = await strapi.service('api::auth.auth').validateProConnectToken(id_token);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 ID TOKEN DECODED (proconnectLogin)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(JSON.stringify(decodedToken, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // 2. Récupérer et décoder le userinfo
      const userinfoResponse = await axios.get(
        `${PROCONNECT_BASE_URL}/api/v2/userinfo`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 USERINFO ENDPOINT RESPONSE (proconnectLogin)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Status:', userinfoResponse.status);
      console.log('Content-Type:', userinfoResponse.headers['content-type']);
      console.log('Raw Data:', JSON.stringify(userinfoResponse.data, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      let userInfo: any;
      const contentType = userinfoResponse.headers['content-type'] || '';

      // 3. Si c'est un JWT, le valider
      if (contentType.includes('application/jwt') || typeof userinfoResponse.data === 'string') {
        // @ts-ignore
        userInfo = await strapi.service('api::auth.auth').validateProConnectToken(userinfoResponse.data);
        console.log('UserInfo après décodage JWT:', JSON.stringify(userInfo, null, 2));
      } else {
        userInfo = userinfoResponse.data;
        console.log('UserInfo (JSON direct):', JSON.stringify(userInfo, null, 2));
      }

      // 4. Fusionner les données
      const completeUserData = {
        ...decodedToken,
        ...userInfo,
      };

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 COMPLETE USER DATA (proconnectLogin - après fusion)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(JSON.stringify(completeUserData, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // 5. Créer ou récupérer l'utilisateur
      const user = await strapi.service('api::auth.auth').findOrCreateUser(completeUserData);

      // 5bis. Mettre à jour lastLoginAt maintenant que l'utilisateur est connu
      // @ts-ignore
      await strapi.plugins['users-permissions'].services.user.edit(user.id, {
        lastLoginAt: new Date(),
      });

      // 6. Générer le JWT Strapi
      // @ts-ignore
      const strapiJwt = strapi.plugins['users-permissions'].services.jwt.issue({
        id: user.id,
      });

      return {
        jwt: strapiJwt,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      };
    } catch (err) {
      console.error('Erreur ProConnect:', err?.message || err);
      // @ts-ignore
      if (err && err.response) {
        // @ts-ignore
        console.error('Status:', err.response.status);
        // @ts-ignore
        console.error('Data:', err.response.data);
      }
      return ctx.unauthorized(`Erreur: ${err?.message || 'Unknown error'}`);
    }
  },

  /**
   * Callback ProConnect - Reçoit le code OAuth et redirige vers l'app mobile
   */
  async proconnectCallback(ctx) {
    const { code, state } = ctx.query;

    if (!code) {
      return ctx.badRequest('Le paramètre "code" est manquant.');
    }

    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📥 ProConnect Callback Received (Backend)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📝 Code:', code.substring(0, 20) + '...');
      console.log('🔐 State:', state);
      console.log('');
      console.log('🔍 ProConnect Configuration (Backend):');
      console.log('🌐 Domain:', process.env.PROCONNECT_DOMAIN || 'NOT SET');
      console.log('🔗 Base URL:', PROCONNECT_BASE_URL);
      console.log('🔗 Token Endpoint:', `${PROCONNECT_BASE_URL}/api/v2/token`);
      console.log('🆔 Client ID:', process.env.PROCONNECT_CLIENT_ID || 'NOT SET');
      console.log('🔑 Client Secret:', process.env.PROCONNECT_CLIENT_SECRET ? process.env.PROCONNECT_CLIENT_SECRET.substring(0, 10) + '...' : 'NOT SET');
      console.log('📍 Redirect URI:', process.env.PROCONNECT_REDIRECT_URI_HTTPS || 'NOT SET');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // 1. Échanger le code contre les tokens
      const tokenParams = {
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.PROCONNECT_REDIRECT_URI_HTTPS || 'https://api.mabase.app/api/auth/proconnect/callback',
        client_id: process.env.PROCONNECT_CLIENT_ID,
        client_secret: process.env.PROCONNECT_CLIENT_SECRET,
      };

      console.log('');
      console.log('🔑 Token Exchange Request:');
      console.log('  grant_type:', tokenParams.grant_type);
      console.log('  redirect_uri:', tokenParams.redirect_uri);
      console.log('  client_id:', tokenParams.client_id);
      console.log('  client_secret:', tokenParams.client_secret?.substring(0, 10) + '...');
      console.log('  code:', tokenParams.code?.substring(0, 20) + '...');
      console.log('  Full token_endpoint:', `${PROCONNECT_BASE_URL}/api/v2/token`);

      const tokenResponse = await axios.post(
        `${PROCONNECT_BASE_URL}/api/v2/token`,
        new URLSearchParams(tokenParams),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { id_token, access_token } = tokenResponse.data;

      if (!id_token || !access_token) {
        throw new Error('Tokens manquants dans la réponse ProConnect');
      }

      console.log('✅ Tokens received from ProConnect');

      // 2. Valider l'id_token
      // @ts-ignore
      const decodedToken = await strapi.service('api::auth.auth').validateProConnectToken(id_token);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 ID TOKEN DECODED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(JSON.stringify(decodedToken, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // 3. Récupérer le userinfo
      const userinfoResponse = await axios.get(
        `${PROCONNECT_BASE_URL}/api/v2/userinfo`,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      );

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 USERINFO ENDPOINT RESPONSE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('Status:', userinfoResponse.status);
      console.log('Content-Type:', userinfoResponse.headers['content-type']);
      console.log('Raw Data:', JSON.stringify(userinfoResponse.data, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      let userInfo: any;
      const contentType = userinfoResponse.headers['content-type'] || '';

      if (contentType.includes('application/jwt') || typeof userinfoResponse.data === 'string') {
        // @ts-ignore
        userInfo = await strapi.service('api::auth.auth').validateProConnectToken(userinfoResponse.data);
        console.log('UserInfo après décodage JWT:', JSON.stringify(userInfo, null, 2));
      } else {
        userInfo = userinfoResponse.data;
        console.log('UserInfo (JSON direct):', JSON.stringify(userInfo, null, 2));
      }

      // 4. Fusionner les données
      const completeUserData = {
        ...decodedToken,
        ...userInfo,
      };

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🔍 COMPLETE USER DATA (après fusion)');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(JSON.stringify(completeUserData, null, 2));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // 5. Créer ou récupérer l'utilisateur
      const user = await strapi.service('api::auth.auth').findOrCreateUser(completeUserData);

      // 6. Mettre à jour lastLoginAt
      // @ts-ignore
      await strapi.plugins['users-permissions'].services.user.edit(user.id, {
        lastLoginAt: new Date(),
      });

      // 7. Générer le JWT Strapi
      // @ts-ignore
      const strapiJwt = strapi.plugins['users-permissions'].services.jwt.issue({
        id: user.id,
      });

      console.log('✅ User authenticated, redirecting to app...');

      // 8. Encoder les données pour le deep link
      const userData = encodeURIComponent(JSON.stringify({
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      }));

      // 9. Rediriger vers l'app mobile via deep link
      const deepLink = `mabase://auth/callback?jwt=${strapiJwt}&user=${userData}`;

      ctx.redirect(deepLink);
    } catch (err) {
      console.error('❌ ProConnect callback error:', err?.message || err);
      // @ts-ignore
      if (err && err.response) {
        // @ts-ignore
        console.error('Status:', err.response.status);
        // @ts-ignore
        console.error('Data:', err.response.data);
      }

      // En cas d'erreur, rediriger vers l'app avec l'erreur
      const errorMessage = encodeURIComponent(err?.message || 'Erreur d\'authentification');
      ctx.redirect(`mabase://auth/callback?error=${errorMessage}`);
    }
  },

  /**
   * Callback logout ProConnect
   */
  async proconnectLogoutCallback(ctx) {
    console.log('📤 ProConnect logout callback received');
    // Rediriger vers l'app mobile
    ctx.redirect('mabase://post-logout');
  },
});

