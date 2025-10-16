/**
 * Policy pour permettre l'accès public aux routes n8n
 */

export default (policyContext: any, config: any, { strapi }: any) => {
  // Toujours autoriser l'accès
  return true;
};
