# INTÉGRATIONS API & CONTRATS BACKEND (P02 → P06)

Toutes les requêtes front passent par le préfixe `/api` via `apiPrefixInterceptor` :
- **Développement (`ng serve`)** : `proxy.conf.json` redirige `/api/*` vers `http://localhost:8090` (`api-gateway`).
- **Production (Docker / Nginx)** : `nginx.conf` proxyfie `/api/` vers `http://api-gateway:8090/api/` avec passage du cookie de session HttpOnly et des en-têtes CSRF/Idempotency.

## Endpoints consommés par domaine

| Domaine | Service Angular | Endpoints principaux | Contrat & Particularités |
|---|---|---|---|
| **Authentification & Profil** | `AuthStore` | `GET /api/utilisateurs/me`, `POST /api/utilisateurs/connexion`, `POST /api/utilisateurs`, `PUT /api/utilisateurs/{id}`, `POST /api/utilisateurs/deconnexion`, `POST /api/utilisateurs/refresh` | Authentification cookie HttpOnly JWT HMAC + jeton CSRF + contrôle propriétaire BOLA. |
| **Patrimoines** | `PatrimoineApiService` | `GET /api/patrimoines`, `GET /api/patrimoines/recherche`, `GET /api/patrimoines/{id}` | `/recherche` assure le filtrage serveur (texte, zone Casamance, catégorie, tri, pagination) sur les fiches `PUBLIE`. |
| **Circuits** | `CircuitApiService` | `GET /api/circuits`, `GET /api/circuits/recherche`, `GET /api/circuits/{id}` | Distances calculées en orthodromique indicatif (vol d'oiseau) entre étapes ; lien facultatif vers `guideResponsableId`. |
| **Événements** | `EvenementApiService` | `GET /api/evenements`, `GET /api/evenements/recherche`, `GET /api/evenements/{id}` | Dates rendues explicitement en fuseau officiel `Africa/Dakar` via `DateFrPipe` ; éligibilité `ouvertReservation`. |
| **Guides agréés** | `GuideApiService` | `GET /api/guides`, `GET /api/guides/{id}`, `GET /api/guides/utilisateur/{uid}` | Seuls les guides `VALIDE` et `visibilitePublique=true` sont visibles ; contacts/documents privés masqués publiquement. |
| **Réservations** | `ReservationApiService` | `GET /api/reservations`, `GET /api/reservations/{id}`, `GET /api/reservations/disponibilite`, `POST /api/reservations`, `PUT /api/reservations/{id}/soumettre`, `PUT /api/reservations/{id}/annuler`, `POST /api/reservations/{id}/synchroniser` | Calcul tarifaire et contrôle de capacité effectués exclusivement côté serveur ; `Idempotency-Key` anti-double soumission. |
| **Paiements simulés** | `PaiementApiService` | `GET /api/paiements`, `GET /api/paiements/reservation/{id}`, `POST /api/paiements`, `POST /api/paiements/{id}/simuler` | Mode **simulation pédagogique** Wave / Orange Money uniquement (`estSimule=true`), sans débit réel. |
| **Avis & Modération** | `AvisApiService` | `GET /api/avis`, `GET /api/avis/resumes`, `GET /api/avis/eligibilite`, `POST /api/avis`, `POST /api/avis/{id}/signaler`, `GET /api/avis/mes-avis` | Dépôt conditionné côté serveur par une réservation confirmée/réalisée. |
| **Notifications** | `NotificationApiService` | `GET /api/notifications/mes-notifications`, `GET /api/notifications/non-lues/count`, `PUT /api/notifications/{id}/lire` | Notifications isolées par `utilisateurId` (contrôle BOLA). |
