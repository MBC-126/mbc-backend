"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwks_rsa_1 = __importDefault(require("jwks-rsa"));
// Build ProConnect base URL from env; fallback to integ01 for dev
const envDomain = process.env.PROCONNECT_DOMAIN || 'fca.integ01.dev-agentconnect.fr';
const baseUrl = envDomain.startsWith('http') ? envDomain : `https://${envDomain}`;
const PROCONNECT_JWKS_URI = `${baseUrl}/api/v2/jwks`;
const EXPECTED_ISSUER = `${baseUrl}/api/v2`;
const EXPECTED_AUDIENCE = process.env.PROCONNECT_CLIENT_ID;
const EXPECTED_ALG = (process.env.OIDC_EXPECTED_ALG || 'RS256');
const client = (0, jwks_rsa_1.default)({
    jwksUri: PROCONNECT_JWKS_URI,
    cache: true,
    cacheMaxAge: 600000,
});
function getSigningKey(header, callback) {
    client.getSigningKey(header.kid, (err, key) => {
        if (err) {
            console.error('Erreur lors de la récupération de la clé:', err);
            return callback(err);
        }
        const signingKey = key.getPublicKey();
        callback(null, signingKey);
    });
}
const validateProConnectToken = (token) => {
    return new Promise((resolve, reject) => {
        if (!EXPECTED_AUDIENCE) {
            return reject(new Error('PROCONNECT_CLIENT_ID non défini'));
        }
        jsonwebtoken_1.default.verify(token, getSigningKey, {
            audience: EXPECTED_AUDIENCE,
            issuer: EXPECTED_ISSUER,
            algorithms: [EXPECTED_ALG],
        }, (err, decoded) => {
            if (err || typeof decoded === 'undefined') {
                return reject(err);
            }
            resolve(decoded);
        });
    });
};
const findOrCreateUser = async (decodedToken) => {
    console.log('=== CREATION/RECUPERATION UTILISATEUR ===');
    console.log(JSON.stringify(decodedToken, null, 2));
    console.log('========================================');
    const { email, sub, usual_name, given_name } = decodedToken;
    console.log('Données extraites:', {
        email,
        sub,
        usual_name,
        given_name,
    });
    if (!email) {
        console.error('ATTENTION : Aucun email fourni !');
        throw new Error('Email manquant dans les données utilisateur');
    }
    // @ts-ignore
    let user = await strapi.db.query('plugin::users-permissions.user').findOne({
        where: { email },
    });
    if (!user) {
        console.log('Utilisateur non trouvé, création en cours...');
        // @ts-ignore
        const defaultRole = await strapi.query('plugin::users-permissions.role').findOne({
            where: { type: 'authenticated' },
        });
        // @ts-ignore
        user = await strapi.plugins['users-permissions'].services.user.add({
            username: email.split('@')[0] || sub,
            email,
            provider: 'proconnect',
            confirmed: true,
            role: defaultRole ? defaultRole.id : null,
            firstName: given_name,
            lastName: usual_name,
        });
        console.log('Utilisateur créé avec succès:', {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
        });
    }
    else {
        console.log('Utilisateur existant trouvé:', {
            id: user.id,
            email: user.email,
            username: user.username,
        });
    }
    return user;
};
exports.default = ({ strapi }) => ({
    validateProConnectToken,
    findOrCreateUser,
});
