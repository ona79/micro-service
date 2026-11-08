import { apiRequest } from './client';

/** Récupère la liste de tous les événements culturels (GET /api/evenements) */
export function getAllEvenements() {
  return apiRequest('/evenements');
}

/** Récupère le détail d'un événement par son identifiant (GET /api/evenements/{id}) */
export function getEvenementById(id) {
  return apiRequest(`/evenements/${id}`);
}

