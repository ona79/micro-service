# MATRICE ET PROTOCOLES DE COMMUNICATION INTERSERVICES
**Projet : Gestion du Patrimoine Touristique de la Casamance**  
**Référence Technique : Architecture P01 & TP2 UASZ**

---

## 1. CARTOGRAPHIE DES INTERACTIONS INTER-SERVICES

Dans l'architecture microservices adoptée, les données d'un domaine métier ne sont jamais accessibles directement par un autre microservice via SQL. Tout échange passe par des interfaces REST synchrones.

| Service Appelant | Service Cible | Méthode & Client | But Métier | URI Cible |
|---|---|---|---|---|
| `ms-circuit` | `ms-patrimoine` | `OpenFeign` | Validation d'existence du patrimoine lors de l'ajout d'une étape | `GET /api/patrimoines/{id}` |
| `ms-circuit` | `ms-patrimoine` | `RestTemplate` | Démonstration pédagogique TP2 (endpoint `/communication/resttemplate/...`) | `GET /api/patrimoines/{id}` |
| `ms-circuit` | `ms-patrimoine` | `WebClient` | Démonstration pédagogique TP2 (endpoint `/communication/webclient/...`) | `GET /api/patrimoines/{id}` |
| `ms-evenement` | `ms-patrimoine` | `OpenFeign` | Vérification de l'existence du patrimoine hôte de l'événement | `GET /api/patrimoines/{id}` |
| `ms-reservation` | `ms-circuit` | `OpenFeign` | Vérification de l'existence et calcul des places disponibles | `GET /api/circuits/{id}` |
| `ms-reservation` | `ms-evenement` | `OpenFeign` | Vérification de l'existence et calcul des places disponibles | `GET /api/evenements/{id}` |
| `ms-paiement` | `ms-reservation` | `OpenFeign` | Contrôle du statut et du montant de la réservation à payer | `GET /api/reservations/{id}` |
| `ms-paiement` | `ms-notification` | `OpenFeign` | Déclenchement de l'envoi de confirmation après validation | `POST /api/notifications` |

---

## 2. MODALITÉS TECHNIQUES ET RÉSILIENCE

### 2.1 Déclaration des Clients OpenFeign
Chaque client OpenFeign utilise une déclaration découplée permettant soit la résolution directe par URL d'environnement, soit la résolution dynamique par Eureka LoadBalancer :
```java
@FeignClient(name = "ms-patrimoine", url = "${patrimoine.url:http://localhost:3001}")
public interface PatrimoineClient {
    @GetMapping("/api/patrimoines/{id}")
    PatrimoineDto getPatrimoineById(@PathVariable("id") Long id);
}
```

### 2.2 Configuration des Timeouts
Afin d'éviter le blocage de threads en cascade en cas d'indisponibilité d'un service tiers, les timeouts OpenFeign sont définis dans chaque `application.yml` :
```yaml
spring:
  cloud:
    openfeign:
      client:
        config:
          default:
            connect-timeout: 2000  # 2 secondes pour établir la connexion TCP
            read-timeout: 5000     # 5 secondes pour lire la réponse HTTP
```

### 2.3 Gestion des Erreurs et Exceptions Métier
Lorsqu'un appel Feign échoue, les services traduisent les statuts HTTP reçus :
- **HTTP 404** : converti en `BadRequestException` ("Le patrimoine 999 n'existe pas dans ms-patrimoine").
- **HTTP 503 / Timeout / Connexion refusée** : converti en `ServiceIndisponibleException` avec code HTTP 503 renvoyé au client final de manière claire.
- **GlobalExceptionHandler** : chaque microservice intercepte de manière centralisée les exceptions pour retourner une structure JSON homogène :
```json
{
  "timestamp": "2026-11-17T19:30:00.000Z",
  "status": 400,
  "erreur": "Le patrimoine 999 n'existe pas dans ms-patrimoine",
  "chemin": "/api/circuits"
}
```
