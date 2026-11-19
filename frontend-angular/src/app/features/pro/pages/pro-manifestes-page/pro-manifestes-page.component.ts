import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideRefreshCw, LucideUsers } from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from '../../../../core/auth/auth.store';
import { extractErrorMessage } from '../../../../core/models/api-error.model';
import { Circuit } from '../../../../core/models/circuit.model';
import {
  ManifesteParticipant,
  formatReservationStatusLabel,
  reservationStatusBadgeClass,
} from '../../../../core/models/reservation.model';
import { UiEmptyStateComponent } from '../../../../shared/components/ui-empty-state/ui-empty-state.component';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';
import { UiFilterBarComponent } from '../../../../shared/components/ui-filter-bar/ui-filter-bar.component';
import { DateFrPipe } from '../../../../shared/pipes/date-fr.pipe';
import { CircuitApiService } from '../../../circuits/data-access/circuit-api.service';
import { ReservationApiService } from '../../../reservations/data-access/reservation-api.service';

@Component({
  selector: 'app-pro-manifestes-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    LucideUsers,
    LucideRefreshCw,
    UiEmptyStateComponent,
    UiErrorBannerComponent,
    UiFilterBarComponent,
    DateFrPipe,
  ],
  template: `
    <header class="bo-header">
      <div>
        <p class="bo-header__eyebrow">Opérations terrain · Données non financières</p>
        <h1 class="bo-header__title">Manifestes des participants par circuit</h1>
        <p class="bo-header__lead">
          Liste opérationnelle des voyageurs inscrits par circuit (aucune donnée financière affichée).
        </p>
      </div>
      <button type="button" class="bo-btn" (click)="loadCircuits()" [disabled]="loading()">
        <svg lucideRefreshCw [size]="15" aria-hidden="true"></svg>
        <span>Actualiser</span>
      </button>
    </header>

    @if (error()) {
      <app-ui-error-banner [message]="error()!" (retry)="loadCircuits()" />
    } @else {
      <section class="bo-panel">
        <app-ui-filter-bar
          [showSearch]="false"
          [resultsLabel]="selectedCircuitId() !== null ? manifeste().length + ' participant(s)' : ''"
        >
          <ng-container filter-primary>
            <select
              id="manifeste-circuit-select"
              aria-label="Sélectionner un circuit"
              class="ui-filter-control"
              style="min-width: 280px;"
              [ngModel]="selectedCircuitId()"
              (ngModelChange)="onSelectCircuit($event)"
            >
              <option [ngValue]="null">-- Choisir un circuit --</option>
              @for (c of circuits(); track c.id) {
                <option [ngValue]="c.id">
                  {{ c.id }} — {{ c.nomCircuit }} ({{ c.statutCircuit || 'PUBLIE' }})
                </option>
              }
            </select>
          </ng-container>
        </app-ui-filter-bar>

        @if (selectedCircuitId() === null) {
          <app-ui-empty-state
            title="Aucun circuit sélectionné"
            description="Sélectionnez un circuit ci-dessus pour consulter le manifeste des participants."
          />
        } @else if (loadingManifeste()) {
          <p class="bo-cell-sub">Chargement du manifeste...</p>
        } @else if (manifesteError()) {
          <app-ui-error-banner
            [message]="manifesteError()!"
            (retry)="loadManifeste(selectedCircuitId()!)"
          />
        } @else if (manifeste().length === 0) {
          <app-ui-empty-state
            title="Manifeste vide"
            description="Aucune réservation active ou confirmée n'est enregistrée pour ce circuit."
          />
        } @else {
          <div class="bo-table-wrap">
            <table class="bo-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Client principal</th>
                  <th>Places</th>
                  <th>Prestation</th>
                  <th>Statut</th>
                  <th>Participants nominatifs</th>
                </tr>
              </thead>
              <tbody>
                @for (m of manifeste(); track m.reservationId) {
                  <tr>
                    <td>
                      <strong class="tabular-nums">{{ m.referenceReservation }}</strong>
                      <span class="bo-cell-sub">Résa {{ m.reservationId }}</span>
                    </td>
                    <td>
                      <span class="bo-cell-title">{{ m.nomClient }}</span>
                      @if (m.commentaire) {
                        <span class="bo-cell-sub">Note : {{ m.commentaire }}</span>
                      }
                    </td>
                    <td class="tabular-nums">{{ m.nombrePlaces }}</td>
                    <td>
                      @if (m.datePrestation) {
                        {{ m.datePrestation | dateFr: 'd MMM yyyy' }}
                      } @else {
                        Date à confirmer
                      }
                      @if (m.creneauPrestation) {
                        <span class="bo-cell-sub">{{ m.creneauPrestation }}</span>
                      }
                    </td>
                    <td>
                      <span [class]="statusBadge(m.statut)">{{ statusLabel(m.statut) }}</span>
                    </td>
                    <td>
                      @if (m.participants.length) {
                        <ul style="list-style: none; padding: 0; display: grid; gap: 0.25rem;">
                          @for (p of m.participants; track $index) {
                            <li>
                              <svg lucideUsers [size]="12" aria-hidden="true"></svg>
                              {{ p.nomComplet }}
                              @if (p.categorie) {
                                <span class="ui-badge ui-badge--neutral">{{ p.categorie }}</span>
                              }
                            </li>
                          }
                        </ul>
                      } @else {
                        <span class="bo-cell-sub">Non renseignés</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    }
  `,
})
export class ProManifestesPageComponent implements OnInit {
  private readonly authStore = inject(AuthStore);
  private readonly circuitApi = inject(CircuitApiService);
  private readonly reservationApi = inject(ReservationApiService);

  protected readonly loading = signal(true);
  protected readonly loadingManifeste = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly manifesteError = signal<string | null>(null);

  protected readonly circuits = signal<Circuit[]>([]);
  protected readonly selectedCircuitId = signal<number | null>(null);
  protected readonly manifeste = signal<ManifesteParticipant[]>([]);

  protected readonly statusLabel = formatReservationStatusLabel;
  protected readonly statusBadge = reservationStatusBadgeClass;

  ngOnInit(): void {
    void this.loadCircuits();
  }

  async loadCircuits(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const list = this.authStore.isGuide()
        ? await firstValueFrom(this.circuitApi.getMesCircuitsGuide())
        : (await firstValueFrom(this.circuitApi.rechercher({ inclureNonPublies: true, size: 50 }))).content;
      this.circuits.set(list);
      if (list.length > 0 && this.selectedCircuitId() === null) {
        await this.onSelectCircuit(list[0].id);
      }
    } catch (err) {
      this.error.set(extractErrorMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  async onSelectCircuit(id: number | null): Promise<void> {
    this.selectedCircuitId.set(id);
    if (id === null) {
      this.manifeste.set([]);
      return;
    }
    await this.loadManifeste(id);
  }

  async loadManifeste(circuitId: number): Promise<void> {
    this.loadingManifeste.set(true);
    this.manifesteError.set(null);
    try {
      const rows = await firstValueFrom(this.reservationApi.getManifesteGuide(circuitId));
      this.manifeste.set(rows);
    } catch (err) {
      this.manifesteError.set(extractErrorMessage(err));
      this.manifeste.set([]);
    } finally {
      this.loadingManifeste.set(false);
    }
  }
}
