# GUIDE D'INSTALLATION, CONFIGURATION ET DÉPLOIEMENT

## 1. Prérequis
- Node.js `>= 22.22.3` (vérifié avec `v26.12.0`) et npm `11+`.
- Les 10 microservices backend démarrés (API Gateway sur `:8080`).

## 2. Développement local
```bash
cd frontend-angular
npm install
npm start        # Lance ng serve avec proxy.conf.json (/api -> http://localhost:8080)
```
Ouvrir `http://localhost:4200`.

## 3. Build production & Tests
```bash
npm run build                    # Génère dist/frontend-angular/browser
npx ng test --no-watch           # Exécute la suite unitaire & intégration Vitest
npx playwright test              # Exécute la suite E2E, responsive et A11y (Chromium)
```

## 4. Déploiement Docker / Nginx
Un `Dockerfile` multi-stage et un `nginx.conf` (fallback SPA + reverse-proxy `/api/` vers `http://api-gateway:8080/api/`) sont fournis dans `frontend-angular/`.
```bash
docker build -t patrimoine-frontend-angular:v1 ./frontend-angular
docker run -p 4200:80 patrimoine-frontend-angular:v1
```
Pour l'intégrer dans `docker-compose.yml` (après validation), déclarer un service `frontend-angular` dépendant d'`api-gateway` sur le même réseau Docker Compose.
