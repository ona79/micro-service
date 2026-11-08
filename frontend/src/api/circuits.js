import { apiRequest } from './client';

/** Récupère la liste de tous les circuits touristiques (GET /api/circuits) */
export function getAllCircuits() {
  return apiRequest('/circuits');
}

/** Récupère le détail d'un circuit avec ses étapes enrichies (GET /api/circuits/{id}) */
export function getCircuitById(id) {
  return apiRequest(`/circuits/${id}`);
}

