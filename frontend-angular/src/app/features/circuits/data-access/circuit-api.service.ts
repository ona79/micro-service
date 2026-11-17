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
}
