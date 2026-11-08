import { SITE_CONFIG } from '../config';

/**
 * Fonction unique d'appel HTTP vers l'API Gateway.
 * Gère la sérialisation JSON et extrait le message d'erreur {"erreur": "..."} renvoyé par les microservices.
 *
 * @param {string} endpoint - Chemin relatif (ex. "/patrimoines" ou "/reservations/1/annuler")
 * @param {RequestInit} options - Options fetch (method, body, headers...)
 * @returns {Promise<any>} Données JSON de la réponse
 */
export async function apiRequest(endpoint, options = {}) {
  const url = `${SITE_CONFIG.apiBaseUrl}${endpoint}`;

  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
    });
  } catch {
    throw new Error(
      "Impossible de joindre l'API Gateway (http://localhost:8080). Vérifiez que les microservices sont démarrés."
    );
  }

  // Gestion des réponses sans contenu (ex. 204 No Content)
  if (response.status === 204) {
    return null;
  }

  // Lecture du corps JSON (ou texte en repli)
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    // Le GlobalExceptionHandler du back renvoie {"erreur": "..."}
    const backendMessage = data?.erreur || data?.message || data?.error;
    throw new Error(
      backendMessage || `Erreur lors de la requête (${response.status} ${response.statusText})`
    );
  }

  return data;
}

