# Guide d'optimisation des images avec Cloudflare CDN

Ce guide explique comment configurer et utiliser le système d'optimisation d'images avec Cloudflare CDN.

## 🚀 Fonctionnalités

- ✅ **Compression automatique** avec Sharp côté serveur
- ✅ **Cloudflare CDN** pour une livraison rapide mondiale
- ✅ **Génération de thumbnails** automatique (thumbnail, small, medium, large)
- ✅ **Lazy loading** côté frontend
- ✅ **Formats optimisés** (WebP, JPEG progressif)
- ✅ **Stockage local** avec Strapi (ou S3 si besoin)

## 📋 Architecture

### Comment ça fonctionne

1. **Upload** : L'utilisateur upload une image via Strapi
2. **Traitement** : Sharp génère automatiquement plusieurs formats (thumbnail, small, medium, large)
3. **Stockage** : Les images sont stockées localement dans `/public/uploads/`
4. **Distribution** : Cloudflare CDN cache et distribue les images mondialement
5. **Frontend** : Le client charge le format approprié (thumbnail dans les listes, large en détail)

### Différence avec Cloudinary

| Aspect | Cloudflare CDN | Cloudinary |
|--------|---------------|------------|
| Stockage | Strapi local ou S3 | Cloudinary |
| Transformations | Côté serveur (Sharp) | À la volée (URL) |
| Formats | Pré-générés | Dynamiques |
| CDN | Cloudflare | Cloudinary |
| Coût | CDN seul | Stockage + CDN + transformations |

## 📋 Configuration Backend

### 1. Installation des dépendances

Sharp est déjà installé :
```bash
npm install sharp
```

### 2. Configuration Strapi

Le fichier `config/plugins.ts` est configuré avec :
- Limite de taille : 5MB
- Breakpoints pour génération automatique :
  - `xsmall: 156` (thumbnail)
  - `small: 500`
  - `medium: 750`
  - `large: 1000`
  - `xlarge: 1920`

### 3. Génération automatique des formats

Strapi génère automatiquement tous les formats grâce à Sharp :
- À l'upload, Sharp crée thumbnail, small, medium, large
- Chaque format est optimisé (compression JPEG/WebP)
- Les formats sont accessibles via `image.formats.{size}.url`

### 4. Configuration Cloudflare

#### Étape 1 : DNS
1. Connectez votre domaine à Cloudflare
2. Ajoutez un enregistrement DNS pointant vers votre serveur Strapi
3. Activez le proxy Cloudflare (nuage orange)

#### Étape 2 : Page Rules (optionnel)
Pour optimiser le cache des images :
```
URL: votredomaine.com/uploads/*
Settings:
  - Browser Cache TTL: 1 year
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
```

#### Étape 3 : Polish (optionnel, payant)
Cloudflare Polish peut compresser davantage les images :
- WebP automatique pour les navigateurs compatibles
- Compression lossless ou lossy
- Note : Pas nécessaire si Sharp fait déjà le travail

## 📱 Utilisation Frontend

### Composant OptimizedImage

```tsx
import OptimizedImage from '@/components/common/OptimizedImage';
import { getImageFormats } from '@/utils/imageHelpers';

// Dans une liste (utilise le thumbnail)
<OptimizedImage
  source={{ uri: formats.small }}
  thumbnail={formats.thumbnail}
  useThumbnail={true}
  style={styles.thumbnail}
/>

// Vue détaillée (charge l'image complète)
<OptimizedImage
  source={{ uri: formats.large }}
  thumbnail={formats.thumbnail}
  useThumbnail={false}
  style={styles.fullImage}
/>
```

### Helpers d'images

```tsx
import {
  getImageBySize,
  getThumbnailUrl,
  getImageFormats,
  getCDNUrl
} from '@/utils/imageHelpers';

// Récupérer une taille spécifique
const thumbnailUrl = getImageBySize(strapiImage, 'thumbnail');
const smallUrl = getImageBySize(strapiImage, 'small');

// Extraire tous les formats d'une image Strapi
const formats = getImageFormats(strapiImage);
// { thumbnail, small, medium, large, original }

// Utiliser un domaine CDN personnalisé (optionnel)
const cdnUrl = getCDNUrl(imageUrl, 'https://cdn.votredomaine.com');
```

## 🎯 Tailles d'images disponibles

| Nom | Dimensions | Génération | Usage |
|-----|-----------|------------|-------|
| `thumbnail` | 156x156 | Auto | Listes, preview, avatars |
| `small` | 500px | Auto | Cards, petites images |
| `medium` | 750px | Auto | Images de taille moyenne |
| `large` | 1000px | Auto | Vue détaillée |
| `xlarge` | 1920px | Auto | Plein écran, galerie |
| `original` | Variable | - | Image source |

## 📊 Performance

### Avant optimisation
- Image originale : 2.5 MB
- Temps de chargement : 3-5 secondes (sans CDN)

### Après optimisation
- Thumbnail (156x156) : ~5 KB
- Small (500px) : ~30 KB
- Medium (750px) : ~60 KB
- Large (1000px) : ~100 KB
- Temps de chargement : <500ms avec Cloudflare CDN

### Économies
- 95%+ de réduction de taille pour les thumbnails
- 70-80% de réduction pour les images moyennes
- Livraison via CDN global Cloudflare (latence minimale)
- Support WebP automatique si activé

## 🔧 Optimisations Cloudflare

### Cache automatique
Cloudflare met automatiquement en cache les images statiques :
- TTL par défaut : selon les headers HTTP
- Cache distribué dans 300+ datacenters
- Purge du cache possible via API

### Mirage (Mobile optimization)
Active la compression automatique pour mobile :
- Détection du type de réseau (3G, 4G, WiFi)
- Compression adaptative selon la bande passante
- Lazy loading automatique

### Polish (Optimisation d'images)
Service premium de Cloudflare :
- **Lossless** : compression sans perte
- **Lossy** : compression avec perte (80% quality)
- **WebP** : conversion automatique en WebP
- Note : Peut être redondant avec Sharp

## 🔒 Sécurité

- Limite de taille : 5MB par fichier
- Types acceptés : images uniquement
- Validation côté serveur
- Cloudflare protection DDoS automatique
- Hotlink protection possible via Page Rules

## 📝 Bonnes pratiques

1. **Utiliser le bon format** :
   - `thumbnail` pour les listes
   - `small/medium` pour les cards
   - `large` pour la vue détaillée

2. **Lazy loading** automatique avec `OptimizedImage`

3. **Préchargement** pour une navigation fluide :
   ```tsx
   import { preloadImage } from '@/utils/imageHelpers';
   preloadImage(formats.large);
   ```

4. **Cache Cloudflare** :
   - Les images sont cachées automatiquement
   - Purge via API si nécessaire
   - TTL configurable via Page Rules

5. **Monitorer les performances** :
   - Dashboard Cloudflare Analytics
   - Bandwidth usage
   - Cache hit ratio

## 🐛 Troubleshooting

### Les images ne se chargent pas
- Vérifier que Strapi sert les fichiers `/public/uploads/`
- Vérifier la configuration DNS Cloudflare
- Vérifier que le proxy Cloudflare est activé (nuage orange)

### Images de mauvaise qualité
- Vérifier la configuration Sharp dans `plugins.ts`
- Augmenter la qualité dans `image-processor.ts`
- Utiliser une taille plus grande

### Cache Cloudflare
- Purger le cache : Dashboard > Caching > Purge Everything
- Vérifier les headers HTTP (Cache-Control, ETag)
- Configurer les Page Rules pour `/uploads/*`

## 🔄 Migration depuis stockage existant

Si vous avez déjà des images :

1. Les images existantes dans `/public/uploads/` fonctionneront
2. Regénérer les formats : via script ou plugin Strapi
3. Activer Cloudflare progressivement (TTL court au début)

## 📚 Ressources

- [Cloudflare CDN Documentation](https://developers.cloudflare.com/cache/)
- [Cloudflare Images](https://developers.cloudflare.com/images/)
- [Sharp documentation](https://sharp.pixelplumbingco.uk/)
- [Strapi Upload Plugin](https://docs.strapi.io/dev-docs/plugins/upload)

## 💡 Option : Cloudflare Images

Si vous voulez des transformations à la volée comme Cloudinary :

**Cloudflare Images** (service payant séparé) :
- Stockage + CDN + transformations
- URL transformations : `/cdn-cgi/image/width=500,quality=85/image.jpg`
- $5/mois pour 100k images

Pour l'implémenter :
```bash
npm install @strapi/provider-upload-cloudflare
```

Puis configurer dans `plugins.ts` :
```js
provider: 'cloudflare-images',
providerOptions: {
  accountId: env('CF_ACCOUNT_ID'),
  apiToken: env('CF_API_TOKEN'),
}
```
