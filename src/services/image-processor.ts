/**
 * Service de traitement d'images
 * Génère automatiquement des thumbnails et optimise les images
 */

import sharp from 'sharp';

interface ImageFormat {
  name: string;
  width: number;
  height?: number;
  quality: number;
}

const FORMATS: ImageFormat[] = [
  { name: 'thumbnail', width: 156, height: 156, quality: 80 },
  { name: 'small', width: 500, quality: 85 },
  { name: 'medium', width: 750, quality: 85 },
  { name: 'large', width: 1000, quality: 85 },
];

export default {
  /**
   * Génère tous les formats d'une image
   */
  async generateFormats(imageBuffer: Buffer, originalName: string) {
    const formats = {};

    for (const format of FORMATS) {
      try {
        const resized = await sharp(imageBuffer)
          .resize(format.width, format.height, {
            fit: format.height ? 'cover' : 'inside',
            withoutEnlargement: true,
          })
          .jpeg({
            quality: format.quality,
            progressive: true,
          })
          .toBuffer();

        formats[format.name] = {
          name: `${format.name}_${originalName}`,
          buffer: resized,
          size: resized.length,
          width: format.width,
          height: format.height,
        };

        console.log(`✅ Generated ${format.name}: ${(resized.length / 1024).toFixed(2)} KB`);
      } catch (error) {
        console.error(`❌ Error generating ${format.name}:`, error);
      }
    }

    return formats;
  },

  /**
   * Optimise une image pour le web
   */
  async optimizeImage(imageBuffer: Buffer, maxWidth: number = 2000): Promise<Buffer> {
    try {
      const optimized = await sharp(imageBuffer)
        .resize(maxWidth, maxWidth, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 85,
          progressive: true,
          mozjpeg: true,
        })
        .toBuffer();

      const savedBytes = imageBuffer.length - optimized.length;
      const savedPercent = ((savedBytes / imageBuffer.length) * 100).toFixed(1);

      console.log(`✅ Image optimized: ${savedPercent}% smaller (saved ${(savedBytes / 1024).toFixed(2)} KB)`);

      return optimized;
    } catch (error) {
      console.error('❌ Error optimizing image:', error);
      return imageBuffer;
    }
  },

  /**
   * Convertit une image en WebP pour de meilleures performances
   */
  async convertToWebP(imageBuffer: Buffer, quality: number = 85): Promise<Buffer> {
    try {
      return await sharp(imageBuffer)
        .webp({ quality })
        .toBuffer();
    } catch (error) {
      console.error('❌ Error converting to WebP:', error);
      return imageBuffer;
    }
  },
};
