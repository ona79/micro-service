import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Reservation,
  ReservationCreatePayload,
} from '../../../core/models/reservation.model';

@Injectable({ providedIn: 'root' })
export class ReservationApiService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Reservation[]> {
    return this.http.get<Reservation[]>('/reservations');
  }

  getById(id: number | string): Observable<Reservation> {
    return this.http.get<Reservation>(`/reservations/${id}`);
  }

  create(payload: ReservationCreatePayload): Observable<Reservation> {
    return this.http.post<Reservation>('/reservations', payload);
  }

  cancel(id: number): Observable<Reservation> {
    return this.http.put<Reservation>(`/reservations/${id}/annuler`, {});
  }
}
