import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideArrowRight,
  LucideKeyRound,
  LucideLock,
  LucideMail,
} from '@lucide/angular';
import { toast } from 'ngx-sonner';
import { AuthStore } from '../../../../core/auth/auth.store';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideMail,
    LucideLock,
    LucideKeyRound,
    LucideArrowRight,
    UiErrorBannerComponent,
  ],
  template: `
    <section class="auth-section">
      <div class="container auth-grid">
        <aside class="auth-visual">
          <img
            src="/images/auth-cover.jpg"
            alt="Sanctuaire naturel et patrimoine du Sénégal"
            class="auth-visual__img"
          />
          <div class="auth-visual__overlay">
            <span class="ui-badge ui-badge--terracotta">Portail Authentifié · UASZ</span>
            <h2 class="auth-visual__title">
              Accédez à vos réservations, paiements et carnets de visite
            </h2>
            <p class="auth-visual__caption">
              Session sécurisée par cookie HttpOnly signé (HMAC-SHA256) et contrôle d’accès
              par rôle sur l’API Gateway.
            </p>
          </div>
        </aside>

        <div class="auth-panel">
          <header class="auth-header">
            <p class="auth-header__eyebrow">Espace Membre &amp; Administration</p>
            <h1 class="auth-header__title">Connexion à votre compte</h1>
            <p class="auth-header__subtitle">
              Connectez-vous pour gérer vos réservations, régler vos visites ou administrer
              le catalogue patrimonial.
            </p>
          </header>

          @if (expiredNotice()) {
            <div class="session-expired-notice" role="status">
              Votre session a expiré ou nécessite une authentification préalable. Veuillez
              vous connecter pour continuer.
            </div>
          }

          @if (serverError()) {
            <app-ui-error-banner
              title="Échec de la connexion"
              [message]="serverError()"
              [showRetry]="false"
            />
          }

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form" novalidate>
            <div class="form-field">
              <label for="login-email" class="form-label">Adresse email</label>
              <div class="input-icon-wrap">
                <svg lucideMail [size]="16" class="input-icon" aria-hidden="true"></svg>
                <input
                  id="login-email"
                  type="email"
                  formControlName="email"
                  autocomplete="email"
                  placeholder="exemple@zig.univ.sn"
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
              <label for="login-password" class="form-label">Mot de passe</label>
              <div class="input-icon-wrap">
                <svg lucideLock [size]="16" class="input-icon" aria-hidden="true"></svg>
                <input
                  id="login-password"
                  type="password"
                  formControlName="motDePasse"
                  autocomplete="current-password"
                  placeholder="Votre mot de passe"
                  class="form-input form-input--with-icon"
                />
              </div>
              @if (isFieldInvalid('motDePasse')) {
                <p class="field-error" role="alert">
                  Le mot de passe est obligatoire.
                </p>
              }
            </div>

            <button
              type="submit"
              class="auth-submit-btn"
              [disabled]="authStore.loading()"
            >
              @if (authStore.loading()) {
                <span>Vérification des identifiants...</span>
              } @else {
                <span>Se connecter</span>
                <svg lucideArrowRight [size]="16" aria-hidden="true"></svg>
              }
            </button>
          </form>

          <div class="quick-accounts" aria-label="Comptes de démonstration par rôle">
            <p class="quick-accounts__title">
              <svg lucideKeyRound [size]="14" aria-hidden="true"></svg>
              <span>Accès rapide de démonstration (Comptes réels en base H2)</span>
            </p>
            <div class="quick-accounts__grid">
              <button
                type="button"
                class="quick-pill"
                (click)="fillDemo('moussa.diop@zig.univ.sn', 'Passer123!')"
              >
                <strong>Touriste</strong>
                <span>moussa.diop&#64;zig.univ.sn</span>
              </button>
              <button
                type="button"
                class="quick-pill"
                (click)="fillDemo('awa.sagna@zig.univ.sn', 'Gestion2026!')"
              >
                <strong>Gestionnaire de site</strong>
                <span>awa.sagna&#64;zig.univ.sn</span>
              </button>
              <button
                type="button"
                class="quick-pill"
                (click)="fillDemo('lamine.faty@univ-zig.sn', 'Admin2026!')"
              >
                <strong>Administrateur</strong>
                <span>lamine.faty&#64;univ-zig.sn</span>
              </button>
            </div>
          </div>

          <footer class="auth-footer">
            <span>Vous n’avez pas encore de compte ?</span>
            <a routerLink="/inscription" class="auth-footer__link">Créer un compte visiteur</a>
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
      grid-template-columns: 1.05fr 1fr;
      background-color: var(--surface-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xl);
      overflow: hidden;
      box-shadow: var(--shadow-lg);
    }

    .auth-visual {
      position: relative;
      min-height: 540px;
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
      opacity: 0.82;
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

    .session-expired-notice {
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      background-color: var(--warning-soft);
      color: var(--warning);
      border: 1px solid rgba(154, 91, 19, 0.25);
      font-size: var(--text-sm);
      font-weight: 600;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
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
      transition: background-color var(--transition-fast);
      margin-top: var(--space-1);
    }

    .auth-submit-btn:hover:not(:disabled) {
      background-color: var(--brand-primary-hover);
    }

    .auth-submit-btn:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .quick-accounts {
      padding: var(--space-4);
      border-radius: var(--radius-md);
      background-color: var(--surface-sand);
      border: 1px solid var(--border-subtle);
    }

    .quick-accounts__title {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: var(--text-xs);
      font-weight: 700;
      color: var(--ink-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: var(--space-3);
    }

    .quick-accounts__grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: var(--space-2);
    }

    .quick-pill {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.15rem;
      padding: 0.5rem 0.65rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-strong);
      background-color: var(--surface-elevated);
      cursor: pointer;
      text-align: left;
      font-family: var(--font-sans);
      transition: border-color var(--transition-fast), background-color var(--transition-fast);
    }

    .quick-pill:hover {
      border-color: var(--brand-primary);
      background-color: var(--brand-soft);
    }

    .quick-pill strong {
      font-size: var(--text-xs);
      color: var(--ink-primary);
    }

    .quick-pill span {
      font-size: 0.7rem;
      color: var(--ink-muted);
      word-break: break-all;
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
      .auth-grid {
        grid-template-columns: 1fr;
      }

      .auth-visual {
        min-height: 240px;
      }

      .auth-panel {
        padding: var(--space-6);
      }

      .quick-accounts__grid {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly authStore = inject(AuthStore);

  protected readonly submitted = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly expiredNotice = computed(
    () =>
      this.route.snapshot.queryParamMap.get('expired') === '1' ||
      Boolean(this.route.snapshot.queryParamMap.get('returnUrl'))
  );

  protected readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    motDePasse: ['', [Validators.required]],
  });

  protected isFieldInvalid(field: 'email' | 'motDePasse'): boolean {
    const ctrl = this.loginForm.controls[field];
    return ctrl.invalid && (ctrl.touched || this.submitted());
  }

  protected fillDemo(email: string, motDePasse: string): void {
    this.loginForm.setValue({ email, motDePasse });
    this.serverError.set(null);
  }

  protected async onSubmit(): Promise<void> {
    this.submitted.set(true);
    this.serverError.set(null);

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    try {
      const user = await this.authStore.login(this.loginForm.getRawValue());
      toast.success(`Bienvenue, ${user.prenom} ${user.nom}`);
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      if (returnUrl && returnUrl.startsWith('/')) {
        await this.router.navigateByUrl(returnUrl);
      } else if (user.role === 'ADMINISTRATEUR' || user.role === 'GESTIONNAIRE_SITE' || user.role === 'CONSERVATEUR') {
        await this.router.navigate(['/administration']);
      } else {
        await this.router.navigate(['/mon-espace']);
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Identifiants invalides';
      this.serverError.set(msg);
    }
  }
}
