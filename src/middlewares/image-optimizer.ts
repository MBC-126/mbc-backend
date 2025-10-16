/**
 * Middleware pour optimiser automatiquement les images
 */

import sharp from 'sharp';

export default (config, { strapi }) => {
  return async (ctx, next) => {
    await next();

    // Intercepter les uploads d'images
    if (ctx.request.files && ctx.request.files.files) {
      const files = Array.isArray(ctx.request.files.files)
        ? ctx.request.files.files
        : [ctx.request.files.files];

      for (const file of files) {
        if (file.type?.startsWith('image/')) {
          try {
            // Optimiser l'image avec sharp
            const optimized = await sharp(file.path)
              .resize(2000, 2000, {
                fit: 'inside',
                withoutEnlargement: true,
              })
              .jpeg({
                quality: 85,
                progressive: true,
                mozjpeg: true,
              })
              .webp({
                quality: 85,
              })
              .toBuffer();

            // Remplacer le fichier original par la version optimisée
            file.buffer = optimized;
            file.size = optimized.length;

            strapi.log.info(`Image optimized: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
          } catch (error) {
            strapi.log.error(`Error optimizing image ${file.name}:`, error);
          }
        }
      }
    }
  };
};
