#!/usr/bin/env node

/**
 * Générateur de secrets pour Strapi
 * Génère tous les secrets nécessaires pour la configuration
 */

const crypto = require('crypto');

function generateSecret(length = 32) {
  return crypto.randomBytes(length).toString('base64');
}

console.log('🔐 Génération des secrets Strapi');
console.log('=================================\n');

const secrets = {
  APP_KEYS: Array.from({ length: 4 }, () => generateSecret(16)).join(','),
  API_TOKEN_SALT: generateSecret(16),
  ADMIN_JWT_SECRET: generateSecret(16),
  TRANSFER_TOKEN_SALT: generateSecret(16),
  JWT_SECRET: generateSecret(16)
};

console.log('📋 Copie ces commandes pour définir les variables sur Clever Cloud:\n');
console.log('# Variables Strapi obligatoires');
console.log(`clever env set APP_KEYS "${secrets.APP_KEYS}"`);
console.log(`clever env set API_TOKEN_SALT "${secrets.API_TOKEN_SALT}"`);
console.log(`clever env set ADMIN_JWT_SECRET "${secrets.ADMIN_JWT_SECRET}"`);
console.log(`clever env set TRANSFER_TOKEN_SALT "${secrets.TRANSFER_TOKEN_SALT}"`);
console.log(`clever env set JWT_SECRET "${secrets.JWT_SECRET}"`);

console.log('\n# Configuration de base');
console.log('clever env set NODE_ENV production');
console.log('clever env set HOST "0.0.0.0"');
console.log('clever env set PORT 8080');

console.log('\n# Database (si PostgreSQL add-on linké, ces variables sont auto)');
console.log('clever env set DATABASE_CLIENT postgres');
console.log('clever env set DATABASE_HOST \'${POSTGRESQL_ADDON_HOST}\'');
console.log('clever env set DATABASE_PORT \'${POSTGRESQL_ADDON_PORT}\'');
console.log('clever env set DATABASE_NAME \'${POSTGRESQL_ADDON_DB}\'');
console.log('clever env set DATABASE_USERNAME \'${POSTGRESQL_ADDON_USER}\'');
console.log('clever env set DATABASE_PASSWORD \'${POSTGRESQL_ADDON_PASSWORD}\'');
console.log('clever env set DATABASE_SSL false');

console.log('\n# Healthcheck (recommandé)');
console.log('clever env set CC_HEALTH_CHECK_PATH "/_health"');

console.log('\n📝 Ou crée un fichier .env.production:\n');
console.log('NODE_ENV=production');
console.log('HOST=0.0.0.0');
console.log('PORT=8080');
console.log(`APP_KEYS=${secrets.APP_KEYS}`);
console.log(`API_TOKEN_SALT=${secrets.API_TOKEN_SALT}`);
console.log(`ADMIN_JWT_SECRET=${secrets.ADMIN_JWT_SECRET}`);
console.log(`TRANSFER_TOKEN_SALT=${secrets.TRANSFER_TOKEN_SALT}`);
console.log(`JWT_SECRET=${secrets.JWT_SECRET}`);

console.log('\n⚠️  IMPORTANT: Garde ces secrets en sécurité !');
console.log('💡 Sauvegarde-les dans un gestionnaire de mots de passe\n');
