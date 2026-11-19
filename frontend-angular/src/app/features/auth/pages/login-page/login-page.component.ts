import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideArrowRight,
  LucideCompass,
  LucideEye,
  LucideEyeOff,
  LucideKeyRound,
  LucideLock,
  LucideMail,
} from '@lucide/angular';
import { toast } from 'ngx-sonner';
import { AuthStore } from '../../../../core/auth/auth.store';
import { getDefaultPostLoginRoute } from '../../../../core/auth/permissions';
import { environment } from '../../../../../environments/environment';
import { UiErrorBannerComponent } from '../../../../shared/components/ui-error-banner/ui-error-banner.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    LucideArrowLeft,
    LucideArrowRight,
    LucideCompass,
    LucideEye,
    LucideEyeOff,
    LucideKeyRound,
    LucideLock,
    LucideMail,
    UiErrorBannerComponent,
  ],
  template: `
    <div class="auth-split">
      <aside class="auth-left" aria-label="Présentation Casamance Patrimoine">
        <img
          src="/images/auth-cover.webp"
          width="800"
          height="600"
          alt=""
          class="auth-left__img"
        />
        <div class="auth-left__veil" aria-hidden="true"></div>
        <div class="auth-left__content">
          <h2 class="auth-left__title">
            Accès à <span class="auth-left__accent">Casamance Patrimoine</span>
          </h2>
          <p class="auth-left__desc">
            Retrouvez vos réservations, vos billets et vos circuits culturels en Casamance.
          </p>
        </div>
      </aside>

      <main class="auth-right">
        <div class="auth-topbar">
          <a routerLink="/" class="auth-back-btn">
            <svg lucideArrowLeft [size]="15" aria-hidden="true"></svg>
            <span>Retour au site</span>
          </a>
        </div>

        <div class="auth-form-wrap">
          <div class="auth-brand">
            <span class="auth-brand__mark" aria-hidden="true">
              <img src="/logo-emblem.png" width="30" height="30" alt="" style="object-fit:contain;" />
            </span>
            <span class="auth-brand__name">Casamance Patrimoine</span>
          </div>

          <h1 class="auth-title">Connexion</h1>

          @if (expiredNotice()) {
            <div class="session-expired-notice" role="status">
              Votre session a expiré. Veuillez vous reconnecter.
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
              <label for="login-email" class="sr-only">Adresse email</label>
              <div class="input-icon-wrap">
                <svg lucideMail [size]="16" class="input-icon" aria-hidden="true"></svg>
                <input
                  id="login-email"
                  type="email"
                  formControlName="email"
                  autocomplete="email"
                  aria-label="Adresse email"
                  placeholder="Adresse email"
                  class="form-input"
                />
              </div>
              @if (isFieldInvalid('email')) {
                <p class="field-error" role="alert">
                  Veuillez saisir une adresse email valide.
                </p>
              }
            </div>

            <div class="form-field">
              <label for="login-password" class="sr-only">Mot de passe</label>
              <div class="input-icon-wrap">
                <svg lucideLock [size]="16" class="input-icon" aria-hidden="true"></svg>
                <input
                  id="login-password"
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="motDePasse"
                  autocomplete="current-password"
                  aria-label="Mot de passe"
                  placeholder="Mot de passe"
                  class="form-input form-input--has-toggle"
                />
                <button
                  type="button"
                  class="password-toggle"
                  (click)="showPassword.set(!showPassword())"
                  [attr.aria-label]="showPassword() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                >
                  @if (showPassword()) {
                    <svg lucideEyeOff [size]="16" aria-hidden="true"></svg>
                  } @else {
                    <svg lucideEye [size]="16" aria-hidden="true"></svg>
                  }
                </button>
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
                <span>Connexion en cours...</span>
              } @else {
                <span>Se connecter</span>
                <svg lucideArrowRight [size]="16" aria-hidden="true"></svg>
              }
            </button>
          </form>

          <details class="quick-accounts">
            <summary class="quick-accounts__summary">
              <svg lucideKeyRound [size]="14" aria-hidden="true"></svg>
              <span>Comptes de démonstration</span>
            </summary>
            <div class="quick-accounts__grid">
              <button
                type="button"
                class="quick-pill"
                (click)="fillDemo('moussa.diop@zig.univ.sn', 'Passer123!')"
              >
                <strong>Visiteur</strong>
                <span>moussa.diop&#64;zig.univ.sn</span>
              </button>
              <button
                type="button"
                class="quick-pill"
                (click)="fillDemo('alassane.badji@zig.univ.sn', 'Gestion2026!')"
              >
                <strong>Guide</strong>
                <span>alassane.badji&#64;zig.univ.sn</span>
              </button>
              <button
                type="button"
                class="quick-pill"
                (click)="fillDemo('awa.sagna@zig.univ.sn', 'Gestion2026!')"
              >
                <strong>Gestionnaire</strong>
                <span>awa.sagna&#64;zig.univ.sn</span>
              </button>
              <button
                type="button"
                class="quick-pill"
                (click)="fillDemo('fatou.kabore@zig.univ.sn', 'Gestion2026!')"
              >
                <strong>Conservateur</strong>
                <span>fatou.kabore&#64;zig.univ.sn</span>
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
          </details>

          <footer class="auth-footer">
            <span>Pas encore de compte ?</span>
            <a routerLink="/inscription" class="auth-footer__link">Créer un compte</a>
          </footer>
        </div>
      </main>
    </div>
  `,
  styles: `
    .auth-split {
      display: grid;
      grid-template-columns: 45% 55%;
      height: 100dvh;
      min-height: 100dvh;
      background-color: #ffffff;
      overflow: hidden;
    }

    .auth-left {
      position: relative;
      display: flex;
      align-items: center;
      padding: 40px 44px;
      background-color: #1f4d3b;
      border-top-right-radius: 36px;
      border-bottom-right-radius: 36px;
      overflow: hidden;
    }

    .auth-left__img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .auth-left__veil {
      position: absolute;
      inset: 0;
      background-color: rgba(31, 77, 59, 0.85);
    }

    .auth-left__content {
      position: relative;
      z-index: 1;
      max-width: 440px;
    }

    .auth-left__title {
      font-family: var(--font-sans);
      font-size: clamp(1.75rem, 2.8vw, 2.5rem);
      font-weight: 700;
      line-height: 1.15;
      color: #ffffff;
      margin: 0 0 14px;
    }

    .auth-left__accent {
      color: #d9a441;
    }

    .auth-left__desc {
      font-size: 0.95rem;
      line-height: 1.5;
      color: rgba(255, 255, 255, 0.88);
      margin: 0;
    }

    .auth-right {
      display: flex;
      flex-direction: column;
      background-color: #ffffff;
      padding: 20px 28px;
      overflow-y: auto;
    }

    .auth-topbar {
      display: flex;
      justify-content: flex-end;
      flex-shrink: 0;
    }

    .auth-back-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 14px;
      border-radius: 8px;
      border: 1px solid var(--border-strong);
      background-color: #ffffff;
      color: var(--ink-primary);
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: background-color 140ms ease, border-color 140ms ease;
    }

    .auth-back-btn:hover {
      background-color: var(--surface-canvas);
      border-color: var(--brand-primary);
    }

    .auth-form-wrap {
      width: 100%;
      max-width: 400px;
      margin: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px 0;
    }

    .auth-brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }

    .auth-brand__mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background-color: #ffffff;
      border: 1px solid var(--border-subtle);
    }

    .auth-brand__name {
      font-size: 14px;
      font-weight: 700;
      color: var(--ink-primary);
    }

    .auth-title {
      font-family: var(--font-sans);
      font-size: 22px;
      font-weight: 600;
      color: var(--ink-primary);
      margin: 0;
    }

    .session-expired-notice {
      padding: 10px 12px;
      border-radius: 8px;
      background-color: var(--warning-soft);
      border: 1px solid rgba(154, 91, 19, 0.3);
      color: var(--warning);
      font-size: 13px;
      font-weight: 600;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .input-icon-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 14px;
      color: var(--ink-muted);
      pointer-events: none;
    }

    .form-input {
      width: 100%;
      height: 44px;
      padding: 0 14px 0 40px;
      border-radius: 10px;
      border: 1px solid var(--border-strong);
      background-color: #f9fafb;
      font-family: var(--font-sans);
      font-size: 14px;
      color: var(--ink-primary);
    }

    .form-input--has-toggle {
      padding-right: 42px;
    }

    .form-input:focus {
      outline: 2px solid #245b45;
      outline-offset: 1px;
      background-color: #ffffff;
    }

    .password-toggle {
      position: absolute;
      right: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border: none;
      background: transparent;
      color: var(--ink-muted);
      cursor: pointer;
      border-radius: 8px;
    }

    .password-toggle:hover {
      color: var(--ink-primary);
      background-color: rgba(0, 0, 0, 0.04);
    }

    .field-error {
      font-size: 12px;
      color: var(--danger);
      font-weight: 600;
      margin: 0;
    }

    .auth-submit-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      height: 44px;
      border-radius: 10px;
      border: none;
      background-color: #245b45;
      color: #ffffff;
      font-family: var(--font-sans);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 140ms ease;
    }

    .auth-submit-btn:hover:not(:disabled) {
      background-color: #1c4736;
    }

    .auth-submit-btn:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .quick-accounts {
      border-top: 1px solid var(--border-subtle);
      padding-top: 10px;
    }

    .quick-accounts__summary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 600;
      color: var(--ink-secondary);
      cursor: pointer;
      list-style: none;
    }

    .quick-accounts__summary::-webkit-details-marker {
      display: none;
    }

    .quick-accounts__grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 10px;
    }

    .quick-pill {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
      padding: 6px 8px;
      border-radius: 8px;
      border: 1px solid var(--border-strong);
      background-color: #f9fafb;
      cursor: pointer;
      text-align: left;
      font-family: var(--font-sans);
    }

    .quick-pill:hover {
      border-color: #245b45;
      background-color: var(--brand-soft);
    }

    .quick-pill strong {
      font-size: 11px;
      color: var(--ink-primary);
    }

    .quick-pill span {
      font-size: 10px;
      color: var(--ink-muted);
      word-break: break-all;
    }

    .auth-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 13px;
      color: var(--ink-secondary);
      padding-top: 8px;
    }

    .auth-footer__link {
      font-weight: 700;
      color: #245b45;
    }

    @media (max-width: 767px) {
      .auth-split {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr;
        height: auto;
        min-height: 100dvh;
        overflow: visible;
      }

      .auth-left {
        height: 120px;
        padding: 16px 20px;
        border-radius: 0;
      }

      .auth-left__title {
        font-size: 1.25rem;
        margin: 0;
      }

      .auth-left__desc {
        display: none;
      }

      .auth-right {
        padding: 16px 20px 24px;
        overflow-y: visible;
      }

      .auth-form-wrap {
        margin: 12px auto 0;
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
  protected readonly demoEnabled = environment.demo;

  protected readonly submitted = signal(false);
  protected readonly showPassword = signal(false);
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
      } else {
        await this.router.navigate([getDefaultPostLoginRoute(user.role)]);
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
