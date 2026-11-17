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
}
