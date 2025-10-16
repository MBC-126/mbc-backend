export default ({ env }) => ({
  upload: {
    config: {
      // Configuration pour Cloudflare CDN
      // Les images sont stockées localement et servies via Cloudflare
      sizeLimit: 5 * 1024 * 1024, // 5MB max file size

      // Breakpoints pour la génération automatique de formats
      breakpoints: {
        xlarge: 1920,
        large: 1000,
        medium: 750,
        small: 500,
        xsmall: 156, // thumbnail
      },

      // Enable responsive images
      responsiveDimensions: true,
    },
  },
});
