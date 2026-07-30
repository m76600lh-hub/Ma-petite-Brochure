# Ma Petite Brochure

Application web mobile permettant de photographier un appareil, reconnaître sa marque et sa référence, puis retrouver sa notice.

## Contenu indispensable

- `index.html` : application
- `api/analyze.js` : reconnaissance de la photo
- `api/search.js` : recherche de la notice
- `api/status.js` : contrôle de la configuration
- `assets/icon.svg` : icône
- `manifest.webmanifest` et `service-worker.js` : installation sur téléphone
- `confidentialite.html` : information sur les photos

## Mise en ligne sur le projet Vercel existant

1. Envoyer tous les fichiers et dossiers dans le dépôt GitHub.
2. Dans Vercel, ouvrir **Settings > Environment Variables**.
3. Ajouter `ANTHROPIC_API_KEY` avec la clé API Anthropic.
4. Redéployer le dernier déploiement.

Le dossier `api` doit apparaître à la racine du dépôt, au même niveau que `index.html`.

## Important

Les photos sont envoyées au service d'intelligence artificielle uniquement pour identifier l'appareil. Avant une ouverture large au public, ajouter une limitation d'utilisation pour éviter une consommation API incontrôlée.
