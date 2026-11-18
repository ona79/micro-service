# GUIDE D'INSTALLATION, CONFIGURATION ET DÉPLOIEMENT

## 1. Prérequis
- Node.js `>= 22.22.3` et npm `11+`.
- Les 9 microservices backend démarrés (API Gateway sur `:8090`).

## 2. Développement local
```bash
cd frontend-angular
npm install
npm start        # Lance ng serve avec proxy.conf.json (/api -> http://localhost:8090)
```
Ouvrir `http://localhost:4200`.

## 3. Build production & Tests
```bash
npm run build                    # Génère dist/frontend-angular/browser
npx ng test --no-watch           # Exécute la suite unitaire & intégration Vitest
npx playwright test              # Exécute la suite E2E, responsive et A11y (Chromium)
```

## 4. Déploiement Docker / Nginx
Un `Dockerfile` multi-stage et un `nginx.conf` (fallback SPA `try_files` + reverse-proxy `/api/` vers `http://api-gateway:8090/api/`) sont intégrés au `docker-compose.yml` racine.
```bash
docker compose up -d --build
```
L'application est servie sur `http://localhost` (port `80` exposé par `frontend-angular`). En configuration Compose standard, les microservices restent privés sur `app-net` / `data-net`.
