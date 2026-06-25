export default {
  routes: [
    {
      method: 'GET',
      path: '/materiel-requests',
      handler: 'materiel-request.find',
    },
    // ⚠️ Routes statiques AVANT /:id pour éviter que ":id" capture "inbox"/"availability"
    {
      method: 'GET',
      path: '/materiel-requests/availability/check',
      handler: 'materiel-request.checkAvailability',
    },
    {
      method: 'GET',
      path: '/materiel-requests/inbox',
      handler: 'materiel-request.inbox',
    },
    {
      method: 'GET',
      path: '/materiel-requests/:id',
      handler: 'materiel-request.findOne',
    },
    {
      method: 'POST',
      path: '/materiel-requests',
      handler: 'materiel-request.create',
    },
    {
      method: 'DELETE',
      path: '/materiel-requests/:id',
      handler: 'materiel-request.delete',
    },
    // Workflow
    {
      method: 'POST',
      path: '/materiel-requests/:id/accept',
      handler: 'materiel-request.accept',
      config: { policies: ['global::is-equipment-referent'] },
    },
    {
      method: 'POST',
      path: '/materiel-requests/:id/refuse',
      handler: 'materiel-request.refuse',
      config: { policies: ['global::is-equipment-referent'] },
    },
    {
      method: 'POST',
      path: '/materiel-requests/:id/cancel',
      handler: 'materiel-request.cancel',
    },
    {
      method: 'POST',
      path: '/materiel-requests/:id/remis',
      handler: 'materiel-request.markRemis',
      config: { policies: ['global::is-equipment-referent'] },
    },
    {
      method: 'POST',
      path: '/materiel-requests/:id/rendu',
      handler: 'materiel-request.markRendu',
      config: { policies: ['global::is-equipment-referent'] },
    },
  ],
};
