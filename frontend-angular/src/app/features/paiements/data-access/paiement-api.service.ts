import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  ModePaiement,
  Paiement,
  PaiementInitiatePayload,
  PaiementStats,
  SimulationPaiementPayload,
  StatutPaiement,
} from '../../../core/models/paiement.model';
import { PageResponse } from '../../../core/models/patrimoine.model';

export interface PaiementSearchParams {
  q?: string;
  statut?: StatutPaiement | '';
  modePaiement?: ModePaiement | '';
  reservationId?: number | null;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class PaiementApiService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Paiement[]> {
    return this.http.get<Paiement[]>('/paiements');
  }

  rechercher(params: PaiementSearchParams = {}): Observable<PageResponse<Paiement>> {
    let httpParams = new HttpParams();
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.statut) httpParams = httpParams.set('statut', params.statut);
    if (params.modePaiement) httpParams = httpParams.set('modePaiement', params.modePaiement);
    if (params.reservationId != null) {
      httpParams = httpParams.set('reservationId', String(params.reservationId));
    }
    if (params.page != null) httpParams = httpParams.set('page', String(params.page));
    if (params.size != null) httpParams = httpParams.set('size', String(params.size));
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDir) httpParams = httpParams.set('sortDir', params.sortDir);

    return this.http.get<PageResponse<Paiement>>('/paiements/recherche', { params: httpParams });
  }

  getById(id: number | string): Observable<Paiement> {
    return this.http.get<Paiement>(`/paiements/${id}`);
  }

  getByReservation(reservationId: number | string): Observable<Paiement[]> {
    return this.http.get<Paiement[]>(`/paiements/reservation/${reservationId}`);
  }

  getStatistiques(): Observable<PaiementStats> {
    return this.http.get<PaiementStats>('/paiements/statistiques');
  }

  initier(payload: PaiementInitiatePayload, idempotencyKey?: string): Observable<Paiement> {
    const headers = idempotencyKey
      ? new HttpHeaders({ 'Idempotency-Key': idempotencyKey })
      : undefined;
    return this.http.post<Paiement>('/paiements', payload, headers ? { headers } : {});
  }

  simuler(
    paiementId: number,
    payload: SimulationPaiementPayload,
    idempotencyKey?: string
  ): Observable<Paiement> {
    const headers = idempotencyKey
      ? new HttpHeaders({ 'Idempotency-Key': idempotencyKey })
      : undefined;
    return this.http.post<Paiement>(
      `/paiements/${paiementId}/simuler`,
      payload,
      headers ? { headers } : {}
    );
  }

  rembourser(paiementId: number, motif?: string): Observable<Paiement> {
    return this.http.post<Paiement>(
      `/paiements/${paiementId}/rembourser`,
      motif ? { motif } : {}
    );
  }

  rejouerOutbox(): Observable<{ evenementsSynchronises: number }> {
    return this.http.post<{ evenementsSynchronises: number }>('/paiements/outbox/rejouer', {});
  }
}
