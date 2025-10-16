"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
/**
 * Lifecycles pour Infrastructure
 */
exports.default = {
    /**
     * Avant création: générer automatiquement le token ICS
     */
    async beforeCreate(event) {
        const { data } = event.params;
        // Si pas de icsToken, en générer un
        if (!data.icsToken) {
            data.icsToken = crypto_1.default.randomUUID();
            console.log(`✅ Token ICS généré: ${data.icsToken.substring(0, 8)}...`);
        }
    },
    /**
     * Après création: logger
     */
    async afterCreate(event) {
        const { result } = event;
        console.log(`✅ Infrastructure créée: ${result.name} (ID: ${result.id})`);
    },
    /**
     * Après mise à jour: logger
     */
    async afterUpdate(event) {
        const { result } = event;
        console.log(`✅ Infrastructure mise à jour: ${result.name} (ID: ${result.id})`);
    }
};
