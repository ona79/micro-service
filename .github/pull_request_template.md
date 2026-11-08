## Description des changements

Décrivez brièvement les modifications apportées dans cette Pull Request.

## Microservices impactés
- [ ] `ms-patrimoine` (:3001)
- [ ] `ms-circuit` (:3002)
- [ ] `ms-evenement` (:3003)
- [ ] `ms-reservation` (:3004)
- [ ] `ms-utilisateur` (:3005)
- [ ] `ms-paiement` (:3006)
- [ ] `ms-notification` (:3007)
- [ ] `api-gateway` (:8080) / `discovery-server` (:8761) / `config-server` (:8888)

## Conditions d'intégration vérifiées avant fusion (Merge)
- [ ] Compilation Java 21 + génération MapStruct (`./mvnw clean package`)
- [ ] Tests unitaires et MVC au vert (`./mvnw test`)
- [ ] Tests d'intégration inter-microservices (`OpenFeign` / `RestTemplate` / `WebClient`)
- [ ] `Dockerfile` et `docker-compose.yml` valides
