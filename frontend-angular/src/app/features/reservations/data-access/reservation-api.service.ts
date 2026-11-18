import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { PageResponse } from '../../../core/models/patrimoine.model';
import {
  DisponibilitePrestation,
  ManifesteParticipant,
  Reservation,
  ReservationCreatePayload,
  ReservationStats,
  StatutReservation,
  TypeReservation,
} from '../../../core/models/reservation.model';

export interface ReservationSearchParams {
  q?: string;
  statut?: StatutReservation | '';
  type?: TypeReservation | '';
  prestationId?: number | null;
  dateMin?: string;
  dateMax?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class ReservationApiService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>('/reservations');
  }

  rechercher(params: ReservationSearchParams = {}): Observable<PageResponse<Reservation>> {
    let httpParams = new HttpParams();
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.statut) httpParams = httpParams.set('statut', params.statut);
    if (params.type) httpParams = httpParams.set('type', params.type);
    if (params.prestationId != null) {
      httpParams = httpParams.set('prestationId', String(params.prestationId));
    }
    if (params.dateMin) httpParams = httpParams.set('dateMin', params.dateMin);
    if (params.dateMax) httpParams = httpParams.set('dateMax', params.dateMax);
    if (params.page != null) httpParams = httpParams.set('page', String(params.page));
    if (params.size != null) httpParams = httpParams.set('size', String(params.size));
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDir) httpParams = httpParams.set('sortDir', params.sortDir);

    return this.http.get<PageResponse<Reservation>>('/reservations/recherche', {
      params: httpParams,
    });
  }

  getById(id: number | string): Observable<Reservation> {
    return this.http.get<Reservation>(`/reservations/${id}`);
  }

  getDisponibilite(
    type: TypeReservation,
    prestationId: number,
    date?: string | null
  ): Observable<DisponibilitePrestation> {
    let params = new HttpParams()
      .set('type', type)
      .set('prestationId', String(prestationId));
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get<DisponibilitePrestation>('/reservations/disponibilite', { params });
  }

  create(payload: ReservationCreatePayload, idempotencyKey?: string): Observable<Reservation> {
    const headers = idempotencyKey
      ? new HttpHeaders({ 'Idempotency-Key': idempotencyKey })
      : undefined;
    return this.http.post<Reservation>('/reservations', payload, headers ? { headers } : {});
  }

  soumettre(id: number): Observable<Reservation> {
    return this.http.put<Reservation>(`/reservations/${id}/soumettre`, {});
  }

  cancel(id: number, motif?: string): Observable<Reservation> {
    return this.http.put<Reservation>(`/reservations/${id}/annuler`, motif ? { motif } : {});
  }

  synchroniser(id: number): Observable<Reservation> {
    return this.http.post<Reservation>(`/reservations/${id}/synchroniser`, {});
  }

  getStatistiques(): Observable<ReservationStats> {
    return this.http.get<ReservationStats>('/reservations/statistiques');
  }

  getManifesteGuide(circuitId: number): Observable<ManifesteParticipant[]> {
    return this.http.get<ManifesteParticipant[]>(`/reservations/guide/circuits/${circuitId}`);
  }
}
