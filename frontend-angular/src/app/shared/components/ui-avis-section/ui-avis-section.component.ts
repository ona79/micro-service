import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideAlertCircle,
  LucideCheckCircle2,
  LucideFlag,
  LucideMessageSquare,
  LucidePencil,
  LucideShieldCheck,
  LucideStar,
  LucideTrash2,
} from '@lucide/angular';
import { firstValueFrom } from 'rxjs';
import { toast } from 'ngx-sonner';
import { AuthStore } from '../../../core/auth/auth.store';
import { extractErrorMessage } from '../../../core/models/api-error.model';
import {
  Avis,
  AvisEligibilite,
  AvisResume,
  CategorieSignalement,
  CibleAvis,
} from '../../../core/models/avis.model';
import { AvisApiService } from '../../../features/avis/data-access/avis-api.service';
import { DateFrPipe } from '../../pipes/date-fr.pipe';

@Component({
  selector: 'app-ui-avis-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    DecimalPipe,
    DateFrPipe,
    LucideStar,
    LucideShieldCheck,
    LucideFlag,
    LucideMessageSquare,
    LucideCheckCircle2,
    LucideAlertCircle,
    LucidePencil,
    LucideTrash2,
  ],
  template: `
    <section class="avis-section" aria-labelledby="avis-section-title">
      <div class="avis-header">
        <div>
          <p class="avis-eyebrow">Retours d’expérience vérifiés</p>
          <h2 id="avis-section-title" class="avis-title">
            <svg lucideMessageSquare [size]="20" aria-hidden="true"></svg>
            <span>Avis et évaluations</span>
          </h2>
        </div>

        @if (resume(); as r) {
          <div class="avis-score-pill">
            <span class="avis-score-val tabular-nums">
              {{ r.totalAvis > 0 ? (r.noteMoyenne | number: '1.1-2') : '—' }}
            </span>
            <span class="avis-score-max">/ 5</span>
            <span class="avis-score-stars" aria-hidden="true">
              @for (s of stars; track s) {
                <svg
                  lucideStar
                  [size]="15"
                  [class.star-filled]="s <= Math.round(r.noteMoyenne)"
                  [class.star-empty]="s > Math.round(r.noteMoyenne)"
                ></svg>
              }
            </span>
            <span class="avis-score-count tabular-nums">({{ r.totalAvis }} avis vérifié(s))</span>
          </div>
        }
      </div>

      @if (resume(); as r) {
        @if (r.totalAvis > 0) {
          <div class="avis-histogram" aria-label="Répartition des notes">
            @for (s of [5, 4, 3, 2, 1]; track s) {
              <div class="hist-row">
                <span class="hist-label tabular-nums">{{ s }} ★</span>
                <div class="hist-track">
                  <div
                    class="hist-bar"
                    [style.width.%]="percentForStar(r, s)"
                  ></div>
                </div>
                <span class="hist-count tabular-nums">{{ r.repartition[s] ?? 0 }}</span>
              </div>
            }
          </div>
        }
      }

      <div class="avis-composer">
        @if (!authStore.isAuthenticated()) {
          <div class="avis-notice">
            <svg lucideShieldCheck [size]="17" aria-hidden="true"></svg>
            <div>
              <p class="avis-notice__title">Publication réservée aux expériences vérifiées</p>
              <p class="avis-notice__text">
                Seuls les visiteurs disposant d'une réservation confirmée et réalisée peuvent déposer une évaluation.
                <a routerLink="/connexion" class="avis-link">Se connecter</a>
              </p>
            </div>
          </div>
        } @else if (eligibilite(); as elig) {
          @if (elig.eligible) {
            <form class="avis-form" (ngSubmit)="submitNewAvis()">
              <h3 class="avis-form__title">Partager votre retour d'expérience</h3>
              <div class="rating-picker" role="radiogroup" aria-label="Note sur 5">
                @for (s of stars; track s) {
                  <button
                    type="button"
                    class="star-btn"
                    [class.star-btn--active]="s <= newNote()"
                    [attr.aria-label]="'Donner la note de ' + s + ' sur 5'"
                    (click)="newNote.set(s)"
                  >
                    <svg lucideStar [size]="20" aria-hidden="true"></svg>
                  </button>
                }
                <span class="rating-text tabular-nums">{{ newNote() }} / 5</span>
              </div>

              @if (elig.reservationsEligiblesIds.length > 1) {
                <label class="field-group">
                  <span class="field-label">Réservation associée</span>
                  <select class="field-input" [(ngModel)]="selectedReservationId" name="resId">
                    @for (rid of elig.reservationsEligiblesIds; track rid) {
                      <option [ngValue]="rid">Réservation confirmée {{ rid }}</option>
                    }
                  </select>
                </label>
              }

              <label class="field-group">
                <span class="field-label">Votre commentaire détaillé (10 caractères minimum)</span>
                <textarea
                  class="field-input"
                  rows="3"
                  name="commentaire"
                  [(ngModel)]="newCommentaire"
                  placeholder="Décrivez la qualité de l'accueil, des explications culturelles et du déroulement..."
                  required
                  minlength="10"
                  maxlength="2000"
                ></textarea>
              </label>

              @if (formError()) {
                <p class="form-error">{{ formError() }}</p>
              }

              <div class="avis-form__actions">
                <button type="submit" class="btn-submit" [disabled]="submitting()">
                  <svg lucideCheckCircle2 [size]="16" aria-hidden="true"></svg>
                  <span>{{ submitting() ? 'Publication...' : 'Publier mon avis vérifié' }}</span>
                </button>
              </div>
            </form>
          } @else {
            <div class="avis-notice">
              <svg lucideAlertCircle [size]="17" aria-hidden="true"></svg>
              <div>
                <p class="avis-notice__title">
                  {{ elig.dejaEvalue ? 'Avis déjà publié' : 'Évaluation soumise à prestation réalisée' }}
                </p>
                <p class="avis-notice__text">{{ elig.motifIneligibilite }}</p>
              </div>
            </div>
          }
        }
      </div>

      @if (loading()) {
        <p class="avis-loading">Chargement des avis vérifiés...</p>
      } @else if (avisList().length === 0) {
        <p class="avis-empty">
          Aucun avis vérifié publié pour le moment. Soyez le premier voyageur à partager votre retour après visite.
        </p>
      } @else {
        <ul class="avis-list">
          @for (item of avisList(); track item.id) {
            <li class="avis-card">
              <div class="avis-card__top">
                <div>
                  <strong class="avis-card__author">{{ item.auteurNom }}</strong>
                  <span class="avis-card__date">{{ item.datePublication | dateFr: 'd MMM yyyy' }}</span>
                </div>
                <div class="avis-card__badges">
                  @if (item.experienceVerifiee) {
                    <span class="ui-badge ui-badge--success">
                      <svg lucideShieldCheck [size]="12" aria-hidden="true"></svg>
                      Expérience vérifiée
                    </span>
                  }
                  <span class="avis-card__stars tabular-nums">
                    {{ item.note }}/5 ★
                  </span>
                </div>
              </div>

              @if (editingId() === item.id) {
                <div class="edit-box">
                  <div class="rating-picker">
                    @for (s of stars; track s) {
                      <button
                        type="button"
                        class="star-btn"
                        [class.star-btn--active]="s <= editNote"
                        (click)="editNote = s"
                      >
                        <svg lucideStar [size]="16"></svg>
                      </button>
                    }
                  </div>
                  <textarea
                    class="field-input"
                    rows="3"
                    [(ngModel)]="editCommentaire"
                    name="editComm_{{ item.id }}"
                  ></textarea>
                  <div class="inline-actions">
                    <button type="button" class="btn-mini btn-mini--save" (click)="saveEdit(item)">
                      Enregistrer
                    </button>
                    <button type="button" class="btn-mini" (click)="editingId.set(null)">
                      Annuler
                    </button>
                  </div>
                </div>
              } @else {
                <p class="avis-card__body">{{ item.commentaire }}</p>
              }

              @if (item.reponseGuide) {
                <div class="avis-guide-reply">
                  <div class="avis-guide-reply__header">
                    <span class="guide-badge-pill">Réponse officielle</span>
                    <strong class="guide-author">{{ item.guideRepondeurNom || 'Guide Casamance' }}</strong>
                    @if (item.dateReponseGuide) {
                      <span class="guide-date">· {{ item.dateReponseGuide | dateFr: 'd MMM yyyy' }}</span>
                    }
                  </div>
                  <p class="avis-guide-reply__content">{{ item.reponseGuide }}</p>
                </div>
              }

              @if (replyingId() === item.id) {
                <div class="reply-box">
                  <p class="reply-box__title">Répondre officiellement en tant que guide :</p>
                  <textarea
                    class="field-input"
                    rows="3"
                    [(ngModel)]="replyText"
                    placeholder="Rédigez votre réponse officielle au voyageur..."
                  ></textarea>
                  <div class="inline-actions">
                    <button
                      type="button"
                      class="btn-mini btn-mini--save"
                      [disabled]="!replyText.trim() || replySubmitting()"
                      (click)="submitReply(item.id)"
                    >
                      {{ replySubmitting() ? 'Envoi…' : 'Publier la réponse' }}
                    </button>
                    <button type="button" class="btn-mini" (click)="replyingId.set(null)">
                      Annuler
                    </button>
                  </div>
                </div>
              }

              <div class="avis-card__footer">
                @if (canReply(item) && !item.reponseGuide && replyingId() !== item.id) {
                  <button type="button" class="action-link action-link--reply" (click)="startReply(item.id)">
                    <svg lucideMessageSquare [size]="13" aria-hidden="true"></svg>
                    <span>Répondre à cet avis</span>
                  </button>
                }
                @if (isOwnAvis(item)) {
                  <button type="button" class="action-link" (click)="startEdit(item)">
                    <svg lucidePencil [size]="13" aria-hidden="true"></svg>
                    <span>Modifier</span>
                  </button>
                  <button type="button" class="action-link action-link--danger" (click)="deleteAvis(item)">
                    <svg lucideTrash2 [size]="13" aria-hidden="true"></svg>
                    <span>Supprimer</span>
                  </button>
                } @else if (authStore.isAuthenticated()) {
                  <button type="button" class="action-link" (click)="toggleFlag(item.id)">
                    <svg lucideFlag [size]="13" aria-hidden="true"></svg>
                    <span>Signaler cet avis</span>
                  </button>
                }
              </div>

              @if (flaggingId() === item.id) {
                <form class="flag-form" (ngSubmit)="submitFlag(item.id)">
                  <label class="field-group">
                    <span class="field-label">Catégorie du signalement</span>
                    <select class="field-input" [(ngModel)]="flagCategorie" name="cat_{{ item.id }}">
                      <option value="CONTENU_INAPPROPRIE">Contenu inapproprié</option>
                      <option value="PROPOS_OFFENSANTS">Propos offensants</option>
                      <option value="FAUSSE_INFORMATION">Fausse information</option>
                      <option value="SPAM">Spam / Publicité</option>
                      <option value="AUTRE">Autre motif</option>
                    </select>
                  </label>
                  <label class="field-group">
                    <span class="field-label">Motif détaillé (10 caractères min.)</span>
                    <input
                      type="text"
                      class="field-input"
                      [(ngModel)]="flagMotif"
                      name="motif_{{ item.id }}"
                      placeholder="Expliquez pourquoi cet avis doit être examiné..."
                      minlength="10"
                      required
                    />
                  </label>
                  <div class="inline-actions">
                    <button type="submit" class="btn-mini btn-mini--warn">Envoyer le signalement</button>
                    <button type="button" class="btn-mini" (click)="flaggingId.set(null)">Fermer</button>
                  </div>
                </form>
              }
            </li>
          }
        </ul>

        @if (totalPages() > 1) {
          <div class="pagination-row">
            <button
              type="button"
              class="btn-mini"
              [disabled]="page() <= 0"
              (click)="loadPage(page() - 1)"
            >
              Précédent
            </button>
            <span class="tabular-nums">Page {{ page() + 1 }} / {{ totalPages() }}</span>
            <button
              type="button"
              class="btn-mini"
              [disabled]="page() + 1 >= totalPages()"
              (click)="loadPage(page() + 1)"
            >
              Suivant
            </button>
          </div>
        }
      }
    </section>
  `,
  styles: `
    .avis-section {
      margin-top: 2.25rem;
      padding: 1.5rem;
      background: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-xs);
    }
    .avis-header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .avis-eyebrow {
      margin: 0 0 0.2rem;
      font-size: var(--text-xs);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 700;
      color: var(--accent-terracotta);
    }
    .avis-title {
      margin: 0;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-family: var(--font-display);
      font-size: var(--text-lg);
      color: var(--ink-primary);
    }
    .avis-score-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.55rem 0.9rem;
      background: var(--surface-sand);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-pill);
    }
    .avis-score-val {
      font-weight: 800;
      font-size: 1.2rem;
      color: var(--brand-primary);
    }
    .avis-score-max,
    .avis-score-count {
      font-size: var(--text-xs);
      color: var(--ink-muted);
    }
    .avis-score-stars {
      display: inline-flex;
      gap: 2px;
    }
    .star-filled {
      color: var(--accent-ochre);
      fill: var(--accent-ochre);
    }
    .star-empty {
      color: var(--border-strong);
    }
    .avis-histogram {
      display: grid;
      gap: 0.35rem;
      max-width: 360px;
      margin-bottom: 1.5rem;
    }
    .hist-row {
      display: grid;
      grid-template-columns: 36px 1fr 28px;
      align-items: center;
      gap: 0.5rem;
      font-size: var(--text-xs);
      color: var(--ink-secondary);
    }
    .hist-track {
      height: 8px;
      background: var(--surface-sand);
      border-radius: var(--radius-pill);
      overflow: hidden;
    }
    .hist-bar {
      height: 100%;
      background: var(--accent-ochre);
      border-radius: var(--radius-pill);
    }
    .avis-composer {
      margin-bottom: 1.5rem;
    }
    .avis-notice {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      padding: 0.9rem 1rem;
      background: var(--surface-sand);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      color: var(--ink-secondary);
    }
    .avis-notice__title {
      margin: 0 0 0.2rem;
      font-weight: 700;
      color: var(--ink-primary);
      font-size: var(--text-sm);
    }
    .avis-notice__text {
      margin: 0;
      font-size: var(--text-xs);
    }
    .avis-link {
      color: var(--brand-primary);
      font-weight: 700;
      margin-left: 0.35rem;
    }
    .avis-form {
      padding: 1rem;
      background: var(--surface-canvas);
      border: 1px solid var(--brand-border);
      border-radius: var(--radius-md);
      display: grid;
      gap: 0.75rem;
    }
    .avis-form__title {
      margin: 0;
      font-size: var(--text-base);
      color: var(--brand-primary);
    }
    .rating-picker {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .star-btn {
      background: transparent;
      border: none;
      padding: 0.2rem;
      cursor: pointer;
      color: var(--border-strong);
    }
    .star-btn--active {
      color: var(--accent-ochre);
    }
    .star-btn--active svg {
      fill: var(--accent-ochre);
    }
    .rating-text {
      margin-left: 0.5rem;
      font-weight: 700;
      font-size: var(--text-sm);
      color: var(--ink-primary);
    }
    .field-group {
      display: grid;
      gap: 0.35rem;
    }
    .field-label {
      font-size: var(--text-xs);
      font-weight: 600;
      color: var(--ink-secondary);
    }
    .field-input {
      width: 100%;
      padding: 0.6rem 0.75rem;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      font-family: inherit;
      font-size: var(--text-sm);
      background: var(--surface-elevated);
      color: var(--ink-primary);
    }
    .form-error {
      margin: 0;
      font-size: var(--text-xs);
      color: var(--status-error-ink);
      font-weight: 600;
    }
    .btn-submit {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.65rem 1.15rem;
      border: none;
      border-radius: var(--radius-sm);
      background: var(--brand-primary);
      color: var(--ink-on-dark);
      font-weight: 700;
      font-size: var(--text-sm);
      cursor: pointer;
    }
    .btn-submit:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
    .avis-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 0.9rem;
    }
    .avis-card {
      padding: 1rem;
      background: var(--surface-canvas);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      display: grid;
      gap: 0.6rem;
    }
    .avis-card__top {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }
    .avis-card__author {
      color: var(--ink-primary);
      font-size: var(--text-sm);
      margin-right: 0.5rem;
    }
    .avis-card__date {
      font-size: var(--text-xs);
      color: var(--ink-muted);
    }
    .avis-card__badges {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .avis-card__stars {
      font-weight: 800;
      color: var(--accent-ochre);
      font-size: var(--text-sm);
    }
    .avis-card__body {
      margin: 0;
      color: var(--ink-secondary);
      font-size: var(--text-sm);
      line-height: 1.55;
    }
    .avis-card__footer {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .action-link {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      background: none;
      border: none;
      padding: 0;
      font-size: var(--text-xs);
      font-weight: 600;
      color: var(--ink-muted);
      cursor: pointer;
    }
    .action-link:hover {
      color: var(--brand-primary);
    }
    .action-link--danger:hover {
      color: var(--status-error-ink);
    }
    .flag-form,
    .edit-box {
      padding: 0.75rem;
      background: var(--surface-sand);
      border-radius: var(--radius-sm);
      display: grid;
      gap: 0.55rem;
    }
    .inline-actions {
      display: flex;
      gap: 0.5rem;
    }
    .btn-mini {
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-xs);
      border: 1px solid var(--border-strong);
      background: var(--surface-elevated);
      font-size: var(--text-xs);
      font-weight: 600;
      cursor: pointer;
    }
    .btn-mini--save {
      background: var(--brand-primary);
      color: var(--ink-on-dark);
      border-color: var(--brand-primary);
    }
    .avis-guide-reply {
      margin-top: 0.5rem;
      padding: 0.75rem 1rem;
      background: var(--surface-sand, #f8f6f0);
      border-left: 3px solid var(--brand-primary, #0d9488);
      border-radius: 0 var(--radius-sm, 6px) var(--radius-sm, 6px) 0;
    }
    .avis-guide-reply__header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.35rem;
      font-size: var(--text-xs);
    }
    .guide-badge-pill {
      background: var(--brand-primary, #0d9488);
      color: #fff;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-pill, 9999px);
      text-transform: uppercase;
    }
    .guide-author {
      color: var(--ink-primary);
    }
    .guide-date {
      color: var(--ink-muted);
    }
    .avis-guide-reply__content {
      margin: 0;
      font-size: var(--text-sm);
      color: var(--ink-secondary);
      line-height: 1.5;
    }
    .reply-box {
      margin-top: 0.5rem;
      padding: 0.75rem;
      background: var(--surface-sand, #f8f6f0);
      border: 1px dashed var(--brand-primary, #0d9488);
      border-radius: var(--radius-sm, 6px);
      display: grid;
      gap: 0.5rem;
    }
    .reply-box__title {
      margin: 0;
      font-size: var(--text-xs);
      font-weight: 700;
      color: var(--brand-primary, #0d9488);
    }
    .action-link--reply {
      color: var(--brand-primary, #0d9488);
      font-weight: 600;
    }
    .btn-mini--warn {
      background: var(--accent-terracotta);
      color: var(--ink-on-dark);
      border-color: var(--accent-terracotta);
    }
    .pagination-row {
      margin-top: 1rem;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 0.75rem;
      font-size: var(--text-xs);
    }
    .avis-loading,
    .avis-empty {
      margin: 0;
      color: var(--ink-muted);
      font-size: var(--text-sm);
    }
  `,
})
export class UiAvisSectionComponent {
  readonly cibleType = input.required<CibleAvis>();
  readonly cibleId = input.required<number>();

  protected readonly Math = Math;
  protected readonly stars = [1, 2, 3, 4, 5];

  protected readonly authStore = inject(AuthStore);
  private readonly avisApi = inject(AvisApiService);

  protected readonly resume = signal<AvisResume | null>(null);
  protected readonly avisList = signal<Avis[]>([]);
  protected readonly eligibilite = signal<AvisEligibilite | null>(null);
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);

  protected readonly newNote = signal(5);
  protected newCommentaire = '';
  protected selectedReservationId: number | null = null;

  protected readonly editingId = signal<number | null>(null);
  protected editNote = 5;
  protected editCommentaire = '';

  protected readonly flaggingId = signal<number | null>(null);
  protected flagCategorie: CategorieSignalement = 'CONTENU_INAPPROPRIE';
  protected flagMotif = '';

  protected readonly replyingId = signal<number | null>(null);
  protected replyText = '';
  protected readonly replySubmitting = signal(false);

  constructor() {
    effect(() => {
      const type = this.cibleType();
      const id = this.cibleId();
      const _user = this.authStore.user();
      if (!type || !id) return;
      untracked(() => {
        void this.loadAll(type, id, 0);
      });
    });
  }

  protected async loadPage(targetPage: number): Promise<void> {
    await this.loadAll(this.cibleType(), this.cibleId(), targetPage);
  }

  private async loadAll(type: CibleAvis, id: number, targetPage: number): Promise<void> {
    this.loading.set(true);
    try {
      const [resResume, resPage, resElig] = await Promise.all([
        firstValueFrom(this.avisApi.getResume(type, id)).catch(() => null),
        firstValueFrom(this.avisApi.getPublicAvis(type, id, targetPage, 6)).catch(() => null),
        this.authStore.isAuthenticated()
          ? firstValueFrom(this.avisApi.verifierEligibilite(type, id)).catch(() => null)
          : Promise.resolve(null),
      ]);
      this.resume.set(resResume);
      if (resPage) {
        this.avisList.set(resPage.content ?? []);
        this.page.set(resPage.page);
        this.totalPages.set(resPage.totalPages);
      }
      this.eligibilite.set(resElig);
      if (resElig && resElig.reservationsEligiblesIds.length > 0) {
        this.selectedReservationId = resElig.reservationsEligiblesIds[0];
      }
    } finally {
      this.loading.set(false);
    }
  }

  protected percentForStar(resume: AvisResume, star: number): number {
    if (!resume.totalAvis) return 0;
    const count = resume.repartition[star] ?? 0;
    return Math.round((count / resume.totalAvis) * 100);
  }

  protected isOwnAvis(avis: Avis): boolean {
    const u = this.authStore.user();
    return !!u && u.id === avis.auteurId;
  }

  protected async submitNewAvis(): Promise<void> {
    this.formError.set(null);
    const trimmed = this.newCommentaire.trim();
    if (trimmed.length < 10) {
      this.formError.set('Le commentaire doit comporter au moins 10 caractères.');
      return;
    }
    this.submitting.set(true);
    try {
      await firstValueFrom(
        this.avisApi.creerAvis({
          cibleType: this.cibleType(),
          cibleId: this.cibleId(),
          reservationId: this.selectedReservationId,
          note: this.newNote(),
          commentaire: trimmed,
        })
      );
      this.newCommentaire = '';
      this.newNote.set(5);
      toast.success('Votre avis vérifié a été publié.');
      await this.loadAll(this.cibleType(), this.cibleId(), 0);
    } catch (err) {
      const msg = extractErrorMessage(err);
      this.formError.set(msg);
      toast.error(msg);
    } finally {
      this.submitting.set(false);
    }
  }

  protected startEdit(avis: Avis): void {
    this.editingId.set(avis.id);
    this.editNote = avis.note;
    this.editCommentaire = avis.commentaire;
  }

  protected async saveEdit(avis: Avis): Promise<void> {
    const trimmed = this.editCommentaire.trim();
    if (trimmed.length < 10) {
      toast.error('Le commentaire doit comporter au moins 10 caractères.');
      return;
    }
    try {
      await firstValueFrom(
        this.avisApi.modifierAvis(avis.id, { note: this.editNote, commentaire: trimmed })
      );
      this.editingId.set(null);
      toast.success('Avis mis à jour.');
      await this.loadAll(this.cibleType(), this.cibleId(), this.page());
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  }

  protected async deleteAvis(avis: Avis): Promise<void> {
    try {
      await firstValueFrom(this.avisApi.supprimerAvis(avis.id));
      toast.success('Avis supprimé.');
      await this.loadAll(this.cibleType(), this.cibleId(), 0);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  }

  protected toggleFlag(avisId: number): void {
    this.flaggingId.set(this.flaggingId() === avisId ? null : avisId);
    this.flagMotif = '';
    this.flagCategorie = 'CONTENU_INAPPROPRIE';
  }

  protected async submitFlag(avisId: number): Promise<void> {
    const motif = this.flagMotif.trim();
    if (motif.length < 10) {
      toast.error('Veuillez préciser le motif (10 caractères minimum).');
      return;
    }
    try {
      await firstValueFrom(this.avisApi.signalerAvis(avisId, this.flagCategorie, motif));
      this.flaggingId.set(null);
      this.flagMotif = '';
      toast.success('Signalement transmis à l’équipe de modération.');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  }

  protected canReply(item: Avis): boolean {
    const user = this.authStore.user ? this.authStore.user() : null;
    if (!user) return false;
    const role = user.role;
    if (role === 'ADMINISTRATEUR' || role === 'GESTIONNAIRE_SITE') return true;
    if (role === 'GUIDE') {
      return this.cibleType() === 'CIRCUIT' || this.cibleType() === 'GUIDE';
    }
    return false;
  }

  protected startReply(avisId: number): void {
    this.replyingId.set(avisId);
    this.replyText = '';
  }

  protected async submitReply(avisId: number): Promise<void> {
    const text = this.replyText.trim();
    if (!text) {
      toast.error('La réponse ne peut pas être vide.');
      return;
    }
    this.replySubmitting.set(true);
    try {
      const updated = await firstValueFrom(this.avisApi.repondreAvis(avisId, text));
      this.avisList.update((list) => list.map((a) => (a.id === avisId ? updated : a)));
      this.replyingId.set(null);
      this.replyText = '';
      toast.success('Votre réponse de guide a été publiée.');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      this.replySubmitting.set(false);
    }
  }
}
