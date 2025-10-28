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
    {
      method: 'GET',
      path: '/auth/proconnect/callback',
      handler: 'auth.proconnectCallback',
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/auth/proconnect/logout/callback',
      handler: 'auth.proconnectLogoutCallback',
      config: { auth: false },
    },
  ],
};