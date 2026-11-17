import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Evenement } from '../../../core/models/evenement.model';

@Injectable({ providedIn: 'root' })
export class EvenementApiService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Evenement[]> {
    return this.http.get<Evenement[]>('/evenements');
  }

  getById(id: number | string): Observable<Evenement> {
    return this.http.get<Evenement>(`/evenements/${id}`);
  }

  create(payload: Partial<Evenement>): Observable<Evenement> {
    return this.http.post<Evenement>('/evenements', payload);
  }

  delete(id: number | string): Observable<void> {
    return this.http.delete<void>(`/evenements/${id}`);
  }
}
