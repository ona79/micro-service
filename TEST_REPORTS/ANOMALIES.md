# REGISTRE DES ANOMALIES ET ACTIONS CORRECTIVES (`ANOMALIES.md`)

**Date d'audit** : 17 Novembre 2026  
**Méthodologie** : Chaque anomalie détectée lors des phases de compilation, tests unitaires, tests d'intégration, tests full-stack et E2E a été classée par criticité, analysée à la racine, corrigée lorsque son périmètre relevait du code applicatif ou des scripts de validation, et re-vérifiée.

---

## 1. Anomalies Corrigées et Re-Validées (`RESOLVED`)

### ANO-01 — Double appel HTTP sur les pages de détail Angular (`Patrimoine`, `Circuit`, `Evenement`)
- **Criticité** : Moyenne (Performance & Réseau)
- **Composants affectés** :
  - `frontend-angular/src/app/features/patrimoines/pages/patrimoine-detail-page/patrimoine-detail-page.component.ts`
  - `frontend-angular/src/app/features/circuits/pages/circuit-detail-page/circuit-detail-page.component.ts`
  - `frontend-angular/src/app/features/evenements/pages/evenement-detail-page/evenement-detail-page.component.ts`
- **Cause racine** : L'`effect()` écoutant le signal `id()` d'entrée de route appelait `void this.store.ensureLoaded()` et `void this.loadDetail(currentId)` sans `untracked()`. Comme `ensureLoaded()` lisait `this._loaded()` dans le store, le passage de `_loaded` à `true` ré-exécutait l'effet et provoquait un second appel `GET /api/<ressource>/:id`.
- **Correction appliquée** : Encapsulation des effets de bord HTTP dans `untracked(() => { void this.store.ensureLoaded(); void this.loadDetail(currentId); })`.
- **Vérification** : Validé par `HttpTestingController.expectOne('/api/patrimoines/1')` et `httpMock.verify()` dans les suites Vitest (`PASS`).

---

### ANO-02 — Doublon d'attribut ARIA `role="dialog"` dans `UiConfirmDialogComponent`
- **Criticité** : Faible (Accessibilité / Conformité ARIA)
- **Composant affecté** : `frontend-angular/src/app/shared/ui/confirm-dialog/ui-confirm-dialog.component.ts`
- **Cause racine** : `@angular/cdk/dialog` applique déjà `role="dialog"` et `aria-modal="true"` sur le conteneur `<cdk-dialog-container>`. L'ajout d'un second `role="dialog"` sur le `<div class="dialog-panel">` interne créait deux nœuds ARIA imbriqués de même rôle.
- **Correction appliquée** : Suppression de `role="dialog"` et `aria-modal="true"` sur l'élément enfant `.dialog-panel`.
- **Vérification** : `page.getByRole('dialog')` résout exactement 1 élément dans Playwright (`PASS`).

---

### ANO-03 — Chemin `JAVA_HOME` codé en dur pour macOS dans `verify-integration.sh`
- **Criticité** : Moyenne (Portabilité CI/CD Linux)
- **Fichier affecté** : `verify-integration.sh`
- **Cause racine** : Le script d'intégration initial forçait `export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"`, provoquant un échec immédiat sur Linux (`/usr/lib/jvm/java-21-temurin-jdk`).
- **Correction appliquée** : Détection dynamique multi-plateforme (Linux `/usr/lib/jvm/java-21-temurin-jdk`, macOS Homebrew, ou `JAVA_HOME` existant).
- **Vérification** : Exécution réussie sur Linux Fedora x86_64 (`PASS`).

---

### ANO-04 — Absence de tests unitaires JUnit 5 dans `ms-utilisateur` et `ms-paiement`
- **Criticité** : Moyenne (Couverture de tests backend)
- **Services affectés** : `ms-utilisateur`, `ms-paiement`
- **Cause racine** : Seul le test `contextLoads()` existait dans ces deux microservices.
- **Correction appliquée** :
  - Création de `UtilisateurServiceTest.java` (4 tests : inscription + hachage BCrypt, rejet email dupliqué, connexion valide, rejet mot de passe erroné).
  - Création de `PaiementServiceTest.java` (2 tests : paiement nominal avec orchestration `ms-reservation` + `ms-notification`, et résilience en cas d'indisponibilité de `ms-notification`).
- **Vérification** : `53 / 53` tests JUnit 5 passent sur les 10 microservices (`PASS`).

---

### ANO-05 — Échec du build de production Angular hors-ligne dû à l'inlining Google Fonts
- **Criticité** : Moyenne (Build de production en environnement isolé)
- **Fichier affecté** : `frontend-angular/angular.json`
- **Cause racine** : Par défaut, `@angular/build:application` tente de télécharger les polices Google Fonts au moment du `ng build` de production (`optimization.fonts = true`).
- **Correction appliquée** : Configuration explicite de `"optimization": { "scripts": true, "styles": { "minify": true, "inlineCritical": true }, "fonts": false }` dans `angular.json`.
- **Vérification** : `npm run build` compile en `7,2 s` avec `0` erreur et `0` avertissement (`PASS`).

---

## 2. Points d'Attention / Limitations Connues de l'Architecture Backend (`WARNING`)

### WARN-01 — Conflit de port local `8080` avec un conteneur externe (`ecourtier-backend`)
- **Impact** : Le port `8080` par défaut de `api-gateway` est occupé sur la machine hôte par un conteneur Docker externe (`ecourtier-backend`).
- **Mesure d'adaptation** : Conformément aux règles de sécurité interdisant d'arrêter les conteneurs externes, `api-gateway` a été démarré sur le port `8090` (`-Dserver.port=8090`) et `frontend-angular/proxy.conf.json` pointe sur `http://localhost:8090`.

### WARN-02 — Authentification JWT non activée sur `api-gateway`
- **Impact** : Bien que `ms-utilisateur` gère l'inscription et la vérification BCrypt des mots de passe (`POST /api/utilisateurs/connexion`), `api-gateway` n'impose pas encore de filtre de validation JWT sur les routes REST.
- **Statut** : Comportement d'origine du backend conservé pour ne pas casser les contrats API existants ; documenté dans `RAPPORT_SECURITE.md`.
