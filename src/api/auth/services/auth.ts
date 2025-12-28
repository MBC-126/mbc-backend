import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import crypto from 'crypto';

// OAuth State management - SECRET OBLIGATOIRE
const STATE_SECRET = process.env.OAUTH_STATE_SECRET || process.env.APP_KEYS?.split(',')[0];
if (!STATE_SECRET) {
  throw new Error('OAUTH_STATE_SECRET ou APP_KEYS doit être défini pour la sécurité OAuth');
}
const STATE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Build ProConnect base URL from env - REQUIRED in production
const envDomain = process.env.PROCONNECT_DOMAIN;
if (!envDomain) {
  throw new Error('PROCONNECT_DOMAIN doit être défini (ex: fca.integ01.dev-agentconnect.fr pour dev, agent-connect.gouv.fr pour prod)');
}
const baseUrl = envDomain.startsWith('http') ? envDomain : `https://${envDomain}`;

const PROCONNECT_JWKS_URI = `${baseUrl}/api/v2/jwks`;
const EXPECTED_ISSUER = `${baseUrl}/api/v2`;
const EXPECTED_AUDIENCE = process.env.PROCONNECT_CLIENT_ID;
const EXPECTED_ALG = (process.env.OIDC_EXPECTED_ALG || 'RS256') as jwt.Algorithm;

// Validate configuration at startup (no sensitive data logging)
if (!EXPECTED_AUDIENCE) {
  console.warn('ProConnect: PROCONNECT_CLIENT_ID non défini');
}

const client = jwksClient({
  jwksUri: PROCONNECT_JWKS_URI,
  cache: true,
  cacheMaxAge: 600000,
});

function getSigningKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  client.getSigningKey(header.kid as string, (err, key) => {
    if (err) {
      console.error('Erreur lors de la récupération de la clé:', err);
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

const validateProConnectToken = (token: string): Promise<jwt.JwtPayload> => {
  return new Promise((resolve, reject) => {
    if (!EXPECTED_AUDIENCE) {
      return reject(new Error('PROCONNECT_CLIENT_ID non défini'));
    }

    jwt.verify(
      token,
      getSigningKey,
      {
        audience: EXPECTED_AUDIENCE,
        issuer: EXPECTED_ISSUER,
        algorithms: [EXPECTED_ALG],
      },
      (err, decoded) => {
        if (err || typeof decoded === 'undefined') {
          return reject(err);
        }
        resolve(decoded as jwt.JwtPayload);
      }
    );
  });
};

const findOrCreateUser = async (decodedToken: jwt.JwtPayload) => {
  const { email, sub, usual_name, given_name } = decodedToken as any;

  if (!email) {
    console.error('ATTENTION : Aucun email fourni !');
    throw new Error('Email manquant dans les données utilisateur');
  }

  // @ts-ignore
  let user = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { email },
  });

  if (!user) {
    // @ts-ignore
    const defaultRole = await strapi.query('plugin::users-permissions.role').findOne({
      where: { type: 'authenticated' },
    });

    // @ts-ignore
    user = await strapi.plugins['users-permissions'].services.user.add({
      username: (email as string).split('@')[0] || sub,
      email,
      provider: 'proconnect',
      confirmed: true,
      role: defaultRole ? defaultRole.id : null,
      firstName: given_name,
      lastName: usual_name,
    });
  }

  return user;
};

/**
 * Génère un state OAuth signé avec timestamp
 * Format: timestamp.randomBytes.signature
 */
const generateOAuthState = (): string => {
  const timestamp = Date.now().toString();
  const random = crypto.randomBytes(16).toString('hex');
  const data = `${timestamp}.${random}`;
  const signature = crypto
    .createHmac('sha256', STATE_SECRET)
    .update(data)
    .digest('hex');
  return `${data}.${signature}`;
};

/**
 * Valide un state OAuth
 * Vérifie la signature et que le timestamp n'est pas expiré
 */
const validateOAuthState = (state: string): { valid: boolean; error?: string } => {
  if (!state) {
    return { valid: false, error: 'State manquant' };
  }

  const parts = state.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Format de state invalide' };
  }

  const [timestamp, random, signature] = parts;
  const data = `${timestamp}.${random}`;

  // Vérifier la signature (timing-safe comparison)
  const expectedSignature = crypto
    .createHmac('sha256', STATE_SECRET)
    .update(data)
    .digest('hex');

  const isValidSignature = crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );

  if (!isValidSignature) {
    return { valid: false, error: 'Signature de state invalide' };
  }

  // Vérifier l'expiration
  const stateTime = parseInt(timestamp, 10);
  if (isNaN(stateTime)) {
    return { valid: false, error: 'Timestamp invalide' };
  }

  const now = Date.now();
  if (now - stateTime > STATE_TTL_MS) {
    return { valid: false, error: 'State expiré' };
  }

  return { valid: true };
};

export default ({ strapi }) => ({
  validateProConnectToken,
  findOrCreateUser,
  generateOAuthState,
  validateOAuthState,
});

