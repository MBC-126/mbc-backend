export default ({ env }) => ({
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: {
        accessKeyId: env('CELLAR_ADDON_KEY_ID'),
        secretAccessKey: env('CELLAR_ADDON_KEY_SECRET'),
        region: 'us-east-1',
        params: {
          ACL: 'public-read',
          Bucket: env('CELLAR_ADDON_BUCKET_NAME', 'cellarstrapi'), // Fallback au nom du bucket
        },
        endpoint: `https://${env('CELLAR_ADDON_HOST')}`,
        s3ForcePathStyle: true,
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
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
