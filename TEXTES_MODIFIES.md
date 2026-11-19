# Textes modifiés (Avant → Après)

Ce document recense l'ensemble des libellés et messages d'interface simplifiés lors de la refonte (suppression du jargon technique, titres nominaux, suppression des mentions `Africa/Dakar`, et conditionnement des éléments de démonstration à `DEMO=true`).

## Pages publiques & Authentification

| Fichier | Avant | Après |
|---|---|---|
| `http-error.interceptor.ts` | `Impossible de joindre l'API Gateway. Vérifiez que les microservices sont démarrés.` | `Service temporairement indisponible. Veuillez réessayer.` |
| `login-page.component.ts` | `Session sécurisée par cookie HttpOnly signé (HMAC-SHA256) et contrôle d’accès par rôle sur l’API Gateway.` | `Connectez-vous pour gérer vos réservations et accéder à votre espace.` |
| `login-page.component.ts` | `Comptes de démonstration (accès rapide)` *(toujours visible)* | `Comptes de démonstration` *(affiché uniquement si `DEMO=true`)* |
| `account-page.component.ts` | `Session HttpOnly active` | `Session active` |
| `reserver-page.component.html` | `Aucun circuit enregistré dans ms-circuit.` | `Aucun circuit disponible pour le moment.` |
| `reservation-detail-page.component.ts` | `Réservation enregistrée le ... (Africa/Dakar)` | `Réservation enregistrée le ...` |
| `evenements-list-page.component.html` | `Agenda culturel · Fuseau officiel Africa/Dakar` | `Agenda culturel` |
| `evenements-list-page.component.html` | `{{ ev.dateDebut \| dateFr }} (Africa/Dakar)` | `{{ ev.dateDebut \| dateFr }}` |
| `home-page.component.html` | `Rendez-vous culturels · Heure Africa/Dakar` | `Rendez-vous culturels` |
| `paiement-checkout-page.component.ts` | `Statut synchronisé avec ms-paiement.` | `Statut du paiement mis à jour.` |

## Espace professionnel (`/pro/*`)

| Page | Avant | Après |
|---|---|---|
| `pro-dashboard-page` | `Bonjour ..., synthèse opérationnelle` + `Indicateurs temps réel selon vos permissions RBAC actives.` | `Tableau de bord` + `Synthèse de l'activité selon vos permissions.` *(infobulle ⓘ)* |
| `pro-dashboard-page` | `Vue agrégée depuis ms-reservation` | `Réservations enregistrées` |
| `pro-statistiques-page` | `Statistiques et indicateurs métier` + `Données agrégées directement par les microservices...` | `Statistiques` + `Indicateurs d'activité selon votre périmètre.` *(infobulle ⓘ)* |
| `pro-statistiques-page` | `Comptes par rôle RBAC` | `Comptes par rôle` |
| `pro-patrimoines-page` | `Patrimoine culturel, mémoriel & naturel` *(avec sur-titre `Référentiel ms-patrimoine`)* | `Patrimoines` |
| `pro-circuits-page` | `Gestion des circuits touristiques` / `Mes circuits assignés (périmètre BOLA)` | `Circuits` / `Mes circuits` |
| `pro-circuits-page` | `Test communication TP2 (ms-circuit → ms-patrimoine)` | `Vérification liaison site patrimonial` |
| `pro-evenements-page` | `Gestion des événements & festivals` + `Date début/fin (Africa/Dakar) *` | `Événements` + `Date de début *` / `Date de fin *` |
| `pro-utilisateurs-page` | `Utilisateurs, Rôles RBAC & Audit sécurité` + `Comptes & Rôles RBAC` + `Rôle RBAC` | `Utilisateurs` + `Comptes [N]` + `Journal d'audit [N]` + `Rôle` |
| `pro-reservations-page` | `Supervision des réservations` *(sur-titre `Supervision ms-reservation · Workflow P04 strict`)* | `Réservations` |
| `pro-guides-admin-page` | `Validation & gestion des guides` *(sur-titre `Corps des guides ms-utilisateur`)* | `Guides` |
| `pro-moderation-page` | `Modération des avis & signalements` *(sur-titre `Modération & Qualité ms-reservation`)* | `Modération` |
| `pro-notifications-page` | `Centre de notifications` *(sur-titre `Alertes & Supervision ms-notification`)* | `Notifications` |
| `pro-paiements-page` | `Paiements simulés (Wave / Orange Money) & Outbox` + `Rejouer Outbox paiement` | `Paiements` + `Synchroniser les paiements` |
| `pro-controle-acces-page` | `Contrôle d'accès & Billetterie · Horodatage sécurisé ms-reservation` | `Contrôle d'accès` |
