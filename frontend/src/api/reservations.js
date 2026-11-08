import { apiRequest } from './client';

/** Récupère toutes les réservations enregistrées (GET /api/reservations) */
export function getAllReservations() {
  return apiRequest('/reservations');
}

/** Récupère une réservation par son identifiant (GET /api/reservations/{id}) */
export function getReservationById(id) {
  return apiRequest(`/reservations/${id}`);
}

/** Crée une nouvelle réservation de circuit ou d'événement (POST /api/reservations) */
export function createReservation(payload) {
  return apiRequest('/reservations', {
    method: 'POST',
    body: payload,
  });
}

/** Annule une réservation existante (PUT /api/reservations/{id}/annuler) */
export function cancelReservation(id) {
  return apiRequest(`/reservations/${id}/annuler`, {
    method: 'PUT',
  });
}

