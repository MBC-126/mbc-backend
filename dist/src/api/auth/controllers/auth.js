"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
// Build ProConnect base URL from env; fallback to integ01 for dev
const envDomain = process.env.PROCONNECT_DOMAIN || 'fca.integ01.dev-agentconnect.fr';
const PROCONNECT_BASE_URL = envDomain.startsWith('http') ? envDomain : `https://${envDomain}`;
exports.default = ({ strapi }) => ({
    async test(ctx) {
        return { message: 'OK, API custom en TypeScript bien chargée !' };
    },
    async proconnectLogin(ctx) {
        const { id_token, access_token } = ctx.request.body;
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
            // 2. Récupérer et décoder le userinfo
            const userinfoResponse = await axios_1.default.get(`${PROCONNECT_BASE_URL}/api/v2/userinfo`, {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            });
            let userInfo;
            const contentType = userinfoResponse.headers['content-type'] || '';
            // 3. Si c'est un JWT, le valider
            if (contentType.includes('application/jwt') || typeof userinfoResponse.data === 'string') {
                // @ts-ignore
                userInfo = await strapi.service('api::auth.auth').validateProConnectToken(userinfoResponse.data);
            }
            else {
                userInfo = userinfoResponse.data;
            }
            // 4. Fusionner les données
            const completeUserData = {
                ...decodedToken,
                ...userInfo,
            };
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
        }
        catch (err) {
            console.error('Erreur ProConnect:', (err === null || err === void 0 ? void 0 : err.message) || err);
            // @ts-ignore
            if (err && err.response) {
                // @ts-ignore
                console.error('Status:', err.response.status);
                // @ts-ignore
                console.error('Data:', err.response.data);
            }
            return ctx.unauthorized(`Erreur: ${(err === null || err === void 0 ? void 0 : err.message) || 'Unknown error'}`);
        }
    },
});
