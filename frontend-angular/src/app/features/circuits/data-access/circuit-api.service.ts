import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Circuit } from '../../../core/models/circuit.model';

@Injectable({ providedIn: 'root' })
export class CircuitApiService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Circuit[]> {
    return this.http.get<Circuit[]>('/circuits');
  }

  getById(id: number | string): Observable<Circuit> {
    return this.http.get<Circuit>(`/circuits/${id}`);
  }

  create(payload: Partial<Circuit>): Observable<Circuit> {
    return this.http.post<Circuit>('/circuits', payload);
  }

  delete(id: number | string): Observable<void> {
    return this.http.delete<void>(`/circuits/${id}`);
  }

  testerCommunication(
    mode: 'feign' | 'resttemplate' | 'webclient',
    patrimoineId: number | string
  ): Observable<Record<string, unknown>> {
    return this.http.get<Record<string, unknown>>(
      `/circuits/communication/${mode}/patrimoines/${patrimoineId}`
    );
  }
}
