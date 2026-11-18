import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideLock,
  LucideMail,
  LucidePhone,
  LucideUser,
} from '@lucide/angular';
import { toast } from 'ngx-sonner';
import { AuthStore } from '../../../../core/auth/auth.store';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pass = group.get('motDePasse')?.value;
  const confirm = group.get('confirmationMotDePasse')?.value;
  if (pass && confirm && pass !== confirm) {
    return { passwordMismatch: true };
  }
  return null;
}

@Component({
  selector: 'app-register-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideUser,
    LucideMail,
    LucidePhone,
    LucideLock,
    LucideArrowRight,
    UiErrorBannerComponent,
  ],
  template: `
    <section class="auth-section">
      <div class="container auth-grid">
        <aside class="auth-visual">
          <img
            src="/images/hero.jpg"
            alt="Île de Gorée et patrimoine culturel du Sénégal"
            class="auth-visual__img"
          />
          <div class="auth-visual__overlay">
            <span class="ui-badge ui-badge--terracotta">Carnet de Visiteur · Teranga</span>
            <h2 class="auth-visual__title">
              Créez votre compte pour réserver vos parcours et événements culturels
            </h2>
            <p class="auth-visual__caption">
              Retrouvez l’historique de vos réservations, réglez vos visites par Wave,
              Orange Money ou Carte Bancaire et recevez vos confirmations.
            </p>
          </div>
        </aside>

        <div class="auth-panel">
          <header class="auth-header">
            <p class="auth-header__eyebrow">Nouveau Membre</p>
            <h1 class="auth-header__title">Inscription</h1>
            <p class="auth-header__subtitle">
              Tous les nouveaux comptes créés via ce formulaire reçoivent automatiquement
              le statut sécurisé de <strong>Visiteur / Touriste</strong>.
            </p>
          </header>

          @if (serverError()) {
            <app-ui-error-banner
              title="Impossible de finaliser l’inscription"
              [message]="serverError()"
              [showRetry]="false"
            />
          }

          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="auth-form" novalidate>
            <div class="form-row">
              <div class="form-field">
                <label for="reg-prenom" class="form-label">Prénom *</label>
                <div class="input-icon-wrap">
                  <svg lucideUser [size]="15" class="input-icon" aria-hidden="true"></svg>
                  <input
                    id="reg-prenom"
                    type="text"
                    formControlName="prenom"
                    placeholder="Ex: Aminata"
                    class="form-input form-input--with-icon"
                  />
                </div>
                @if (isFieldInvalid('prenom')) {
                  <p class="field-error" role="alert">Le prénom est obligatoire.</p>
                }
              </div>

              <div class="form-field">
                <label for="reg-nom" class="form-label">Nom *</label>
                <div class="input-icon-wrap">
                  <svg lucideUser [size]="15" class="input-icon" aria-hidden="true"></svg>
                  <input
                    id="reg-nom"
                    type="text"
                    formControlName="nom"
                    placeholder="Ex: Ndiaye"
                    class="form-input form-input--with-icon"
                  />
                </div>
                @if (isFieldInvalid('nom')) {
                  <p class="field-error" role="alert">Le nom est obligatoire.</p>
                }
              </div>
            </div>

            <div class="form-field">
              <label for="reg-email" class="form-label">Adresse email *</label>
              <div class="input-icon-wrap">
                <svg lucideMail [size]="15" class="input-icon" aria-hidden="true"></svg>
                <input
                  id="reg-email"
                  type="email"
                  formControlName="email"
                  placeholder="aminata.ndiaye@zig.univ.sn"
                  class="form-input form-input--with-icon"
                />
              </div>
              @if (isFieldInvalid('email')) {
                <p class="field-error" role="alert">
                  Veuillez saisir une adresse email valide.
                </p>
              }
            </div>

            <div class="form-field">
              <label for="reg-telephone" class="form-label">Téléphone</label>
              <div class="input-icon-wrap">
                <svg lucidePhone [size]="15" class="input-icon" aria-hidden="true"></svg>
                <input
                  id="reg-telephone"
                  type="tel"
                  formControlName="telephone"
                  placeholder="+221 77 123 45 67"
                  class="form-input form-input--with-icon"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label for="reg-password" class="form-label">Mot de passe * (min. 6 car.)</label>
                <div class="input-icon-wrap">
                  <svg lucideLock [size]="15" class="input-icon" aria-hidden="true"></svg>
                  <input
                    id="reg-password"
                    type="password"
                    formControlName="motDePasse"
                    placeholder="Minimum 6 caractères"
                    class="form-input form-input--with-icon"
                  />
                </div>
                @if (isFieldInvalid('motDePasse')) {
                  <p class="field-error" role="alert">
                    Le mot de passe doit contenir au moins 6 caractères.
                  </p>
                }
              </div>

              <div class="form-field">
                <label for="reg-confirm" class="form-label">Confirmer le mot de passe *</label>
                <div class="input-icon-wrap">
                  <svg lucideLock [size]="15" class="input-icon" aria-hidden="true"></svg>
                  <input
                    id="reg-confirm"
                    type="password"
                    formControlName="confirmationMotDePasse"
                    placeholder="Répétez le mot de passe"
                    class="form-input form-input--with-icon"
                  />
                </div>
                @if (hasPasswordMismatch()) {
                  <p class="field-error" role="alert">
                    Les deux mots de passe ne correspondent pas.
                  </p>
                }
              </div>
            </div>

            <button
              type="submit"
              class="auth-submit-btn"
              [disabled]="authStore.loading()"
            >
              @if (authStore.loading()) {
                <span>Création du compte en cours...</span>
              } @else {
                <span>Créer mon compte</span>
                <svg lucideArrowRight [size]="16" aria-hidden="true"></svg>
              }
            </button>
          </form>

          <footer class="auth-footer">
            <span>Vous avez déjà un compte ?</span>
            <a routerLink="/connexion" class="auth-footer__link">Se connecter</a>
          </footer>
        </div>
      </div>
    </section>
  `,
  styles: `
    .auth-section {
      padding: var(--space-10) 0 var(--space-16);
    }

    .auth-grid {
      display: grid;
      grid-template-columns: 1fr 1.15fr;
      background-color: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xl);
      overflow: hidden;
      box-shadow: var(--shadow-lg);
    }

    .auth-visual {
      position: relative;
      min-height: 560px;
      background-color: var(--surface-ink);
      display: flex;
      align-items: flex-end;
    }

    .auth-visual__img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.84;
    }

    .auth-visual__overlay {
      position: relative;
      z-index: 1;
      padding: var(--space-8);
      background: linear-gradient(to top, rgba(20, 17, 15, 0.92) 15%, rgba(20, 17, 15, 0.15) 100%);
      color: var(--ink-on-dark);
      width: 100%;
    }

    .auth-visual__title {
      font-size: var(--text-2xl);
      color: #ffffff;
      margin: var(--space-3) 0 var(--space-2);
      line-height: 1.22;
    }

    .auth-visual__caption {
      font-size: var(--text-sm);
      color: rgba(250, 246, 240, 0.85);
      line-height: 1.55;
    }

    .auth-panel {
      padding: var(--space-8) var(--space-10);
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: var(--space-5);
    }

    .auth-header__eyebrow {
      font-size: var(--text-xs);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent-terracotta);
      margin-bottom: var(--space-1);
    }

    .auth-header__title {
      font-size: var(--text-2xl);
      color: var(--ink-primary);
      margin-bottom: var(--space-2);
    }

    .auth-header__subtitle {
      font-size: var(--text-sm);
      color: var(--ink-secondary);
      line-height: 1.55;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-4);
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-label {
      font-size: var(--text-sm);
      font-weight: 600;
      color: var(--ink-primary);
    }

    .input-icon-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 0.85rem;
      color: var(--ink-muted);
      pointer-events: none;
    }

    .form-input {
      width: 100%;
      padding: 0.68rem 0.9rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-strong);
      background-color: var(--surface-canvas);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      color: var(--ink-primary);
    }

    .form-input--with-icon {
      padding-left: 2.4rem;
    }

    .form-input:focus {
      outline: 2px solid var(--brand-primary);
      outline-offset: 1px;
      background-color: var(--surface-elevated);
    }

    .field-error {
      font-size: var(--text-xs);
      color: var(--danger);
      font-weight: 600;
    }

    .auth-submit-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      padding: 0.78rem 1.4rem;
      border-radius: var(--radius-pill);
      border: none;
      background-color: var(--brand-primary);
      color: var(--ink-on-dark);
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      font-weight: 700;
      cursor: pointer;
      margin-top: var(--space-1);
    }

    .auth-submit-btn:hover:not(:disabled) {
      background-color: var(--brand-primary-hover);
    }

    .auth-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-2);
      font-size: var(--text-sm);
      color: var(--ink-secondary);
      padding-top: var(--space-3);
      border-top: 1px solid var(--border-subtle);
    }

    .auth-footer__link {
      font-weight: 700;
      color: var(--brand-primary);
    }

    @media (max-width: 920px) {
      .auth-grid,
      .form-row {
        grid-template-columns: 1fr;
      }

      .auth-visual {
        min-height: 220px;
      }

      .auth-panel {
        padding: var(--space-6);
      }
    }
  `,
})
export class RegisterPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly authStore = inject(AuthStore);

  protected readonly submitted = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly registerForm = this.fb.nonNullable.group(
    {
      prenom: ['', [Validators.required]],
      nom: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      telephone: [''],
      motDePasse: ['', [Validators.required, Validators.minLength(6)]],
      confirmationMotDePasse: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator }
  );

  protected isFieldInvalid(
    field: 'prenom' | 'nom' | 'email' | 'motDePasse' | 'confirmationMotDePasse'
  ): boolean {
    const ctrl = this.registerForm.controls[field];
    return ctrl.invalid && (ctrl.touched || this.submitted());
  }

  protected hasPasswordMismatch(): boolean {
    return (
      Boolean(this.registerForm.errors?.['passwordMismatch']) &&
      (this.registerForm.controls.confirmationMotDePasse.touched || this.submitted())
    );
  }

  protected async onSubmit(): Promise<void> {
    this.submitted.set(true);
    this.serverError.set(null);

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const raw = this.registerForm.getRawValue();
    try {
      const created = await this.authStore.register({
        prenom: raw.prenom.trim(),
        nom: raw.nom.trim(),
        email: raw.email.trim(),
        telephone: raw.telephone.trim() || null,
        motDePasse: raw.motDePasse,
      });
      toast.success(`Compte créé avec succès ! Bienvenue, ${created.prenom}.`);
      await this.router.navigate(['/mon-espace']);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Erreur lors de la création du compte';
      this.serverError.set(msg);
    }
  }
}
