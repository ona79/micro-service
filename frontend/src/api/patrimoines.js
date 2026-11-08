import { apiRequest } from './client';

/** Récupère la liste de tous les patrimoines (GET /api/patrimoines) */
export function getAllPatrimoines() {
  return apiRequest('/patrimoines');
}

/** Récupère le détail d'un patrimoine par son identifiant (GET /api/patrimoines/{id}) */
export function getPatrimoineById(id) {
  return apiRequest(`/patrimoines/${id}`);
}

