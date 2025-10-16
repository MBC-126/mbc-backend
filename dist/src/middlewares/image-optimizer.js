"use strict";
/**
 * Middleware pour optimiser automatiquement les images
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sharp_1 = __importDefault(require("sharp"));
exports.default = (config, { strapi }) => {
    return async (ctx, next) => {
        var _a;
        await next();
        // Intercepter les uploads d'images
        if (ctx.request.files && ctx.request.files.files) {
            const files = Array.isArray(ctx.request.files.files)
                ? ctx.request.files.files
                : [ctx.request.files.files];
            for (const file of files) {
                if ((_a = file.type) === null || _a === void 0 ? void 0 : _a.startsWith('image/')) {
                    try {
                        // Optimiser l'image avec sharp
                        const optimized = await (0, sharp_1.default)(file.path)
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
                    }
                    catch (error) {
                        strapi.log.error(`Error optimizing image ${file.name}:`, error);
                    }
                }
            }
        }
    };
};
