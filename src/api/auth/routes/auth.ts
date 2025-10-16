export default {
  routes: [
    {
      method: 'GET',
      path: '/auth/test',
      handler: 'auth.test',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/auth/proconnect',
      handler: 'auth.proconnectLogin',
      config: { auth: false },
    },
  ],
};