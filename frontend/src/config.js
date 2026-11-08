// Configuration centrale du site
// Modifiez ces valeurs pour personnaliser l'application sans toucher aux composants

export const SITE_CONFIG = {
  // Nom principal affiché dans l'en-tête, le pied de page et le titre de l'onglet
  siteName: 'Patrimoine du Sénégal',

  // Slogan affiché sous le nom du site
  siteSlogan: 'Découvrir, préserver et vivre la richesse culturelle de la Teranga',

  // Préfixe de l'API (redirigé vers http://localhost:8080/api par Vite en développement)
  apiBaseUrl: '/api',

  // Informations académiques (Université Assane Seck de Ziguinchor)
  universite: {
    nom: 'Université Assane Seck de Ziguinchor — UFR Sciences et Technologies — Département Informatique',
    cours: "Développement d'Applications Orientées Services — L3",
  },

  // Codes ou mots-clés de patrimoines nécessitant un ton sobre et respectueux (lieu de mémoire)
  memorialKeywords: ['joola', 'esclaves', 'memorial', 'mémorial'],
};

