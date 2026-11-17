import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Patrimoine } from '../../../core/models/patrimoine.model';

@Injectable({ providedIn: 'root' })
export class PatrimoineApiService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Patrimoine[]> {
    return this.http.get<Patrimoine[]>('/patrimoines');
  }

  getById(id: number | string): Observable<Patrimoine> {
    return this.http.get<Patrimoine>(`/patrimoines/${id}`);
  }
}
