import crypto from 'crypto';

/**
 * Lifecycles pour Infrastructure
 */
export default {
  /**
   * Avant création: générer automatiquement le token ICS
   */
  async beforeCreate(event: any) {
    const { data } = event.params;

    // Si pas de icsToken, en générer un
    if (!data.icsToken) {
      data.icsToken = crypto.randomUUID();
      console.log(`✅ Token ICS généré: ${data.icsToken.substring(0, 8)}...`);
    }
  },

  /**
   * Après création: logger
   */
  async afterCreate(event: any) {
    const { result } = event;
    console.log(`✅ Infrastructure créée: ${result.name} (ID: ${result.id})`);
  },

  /**
   * Après mise à jour: logger
   */
  async afterUpdate(event: any) {
    const { result } = event;
    console.log(`✅ Infrastructure mise à jour: ${result.name} (ID: ${result.id})`);
  }
};
