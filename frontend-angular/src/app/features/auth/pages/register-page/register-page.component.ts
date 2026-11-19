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
  LucideArrowLeft,
  LucideArrowRight,
  LucideCompass,
  LucideEye,
  LucideEyeOff,
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
    LucideArrowLeft,
    LucideArrowRight,
    LucideCompass,
    LucideEye,
    LucideEyeOff,
    LucideLock,
    LucideMail,
    LucidePhone,
    LucideUser,
    UiErrorBannerComponent,
  ],
  template: `
    <div class="auth-split">
      <aside class="auth-left" aria-label="Présentation Casamance Patrimoine">
        <img
          src="/images/hero.webp"
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
            Créez votre compte visiteur pour réserver vos circuits et événements culturels.
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
              <svg lucideCompass [size]="18"></svg>
            </span>
            <span class="auth-brand__name">Casamance Patrimoine</span>
          </div>

          <h1 class="auth-title">Créer un compte</h1>

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
                <label for="reg-prenom" class="sr-only">Prénom</label>
                <div class="input-icon-wrap">
                  <svg lucideUser [size]="15" class="input-icon" aria-hidden="true"></svg>
                  <input
                    id="reg-prenom"
                    type="text"
                    formControlName="prenom"
                    aria-label="Prénom"
                    placeholder="Prénom *"
                    class="form-input"
                  />
                </div>
                @if (isFieldInvalid('prenom')) {
                  <p class="field-error" role="alert">Prénom obligatoire.</p>
                }
              </div>

              <div class="form-field">
                <label for="reg-nom" class="sr-only">Nom</label>
                <div class="input-icon-wrap">
                  <svg lucideUser [size]="15" class="input-icon" aria-hidden="true"></svg>
                  <input
                    id="reg-nom"
                    type="text"
                    formControlName="nom"
                    aria-label="Nom"
                    placeholder="Nom *"
                    class="form-input"
                  />
                </div>
                @if (isFieldInvalid('nom')) {
                  <p class="field-error" role="alert">Nom obligatoire.</p>
                }
              </div>
            </div>

            <div class="form-field">
              <label for="reg-email" class="sr-only">Adresse email</label>
              <div class="input-icon-wrap">
                <svg lucideMail [size]="15" class="input-icon" aria-hidden="true"></svg>
                <input
                  id="reg-email"
                  type="email"
                  formControlName="email"
                  autocomplete="email"
                  aria-label="Adresse email"
                  placeholder="Adresse email *"
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
              <label for="reg-telephone" class="sr-only">Téléphone</label>
              <div class="input-icon-wrap">
                <svg lucidePhone [size]="15" class="input-icon" aria-hidden="true"></svg>
                <input
                  id="reg-telephone"
                  type="tel"
                  formControlName="telephone"
                  autocomplete="tel"
                  aria-label="Téléphone"
                  placeholder="Téléphone (+221 77 ...)"
                  class="form-input"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="form-field">
                <label for="reg-password" class="sr-only">Mot de passe (minimum 6 caractères)</label>
                <div class="input-icon-wrap">
                  <svg lucideLock [size]="15" class="input-icon" aria-hidden="true"></svg>
                  <input
                    id="reg-password"
                    [type]="showPassword() ? 'text' : 'password'"
                    formControlName="motDePasse"
                    autocomplete="new-password"
                    aria-label="Mot de passe"
                    placeholder="Mot de passe *"
                    class="form-input form-input--has-toggle"
                  />
                  <button
                    type="button"
                    class="password-toggle"
                    (click)="showPassword.set(!showPassword())"
                    [attr.aria-label]="showPassword() ? 'Masquer' : 'Afficher'"
                  >
                    @if (showPassword()) {
                      <svg lucideEyeOff [size]="15" aria-hidden="true"></svg>
                    } @else {
                      <svg lucideEye [size]="15" aria-hidden="true"></svg>
                    }
                  </button>
                </div>
                @if (isFieldInvalid('motDePasse')) {
                  <p class="field-error" role="alert">Min. 6 caractères.</p>
                }
              </div>

              <div class="form-field">
                <label for="reg-confirm" class="sr-only">Confirmer le mot de passe</label>
                <div class="input-icon-wrap">
                  <svg lucideLock [size]="15" class="input-icon" aria-hidden="true"></svg>
                  <input
                    id="reg-confirm"
                    [type]="showConfirm() ? 'text' : 'password'"
                    formControlName="confirmationMotDePasse"
                    autocomplete="new-password"
                    aria-label="Confirmer le mot de passe"
                    placeholder="Confirmation *"
                    class="form-input form-input--has-toggle"
                  />
                  <button
                    type="button"
                    class="password-toggle"
                    (click)="showConfirm.set(!showConfirm())"
                    [attr.aria-label]="showConfirm() ? 'Masquer' : 'Afficher'"
                  >
                    @if (showConfirm()) {
                      <svg lucideEyeOff [size]="15" aria-hidden="true"></svg>
                    } @else {
                      <svg lucideEye [size]="15" aria-hidden="true"></svg>
                    }
                  </button>
                </div>
                @if (hasPasswordMismatch()) {
                  <p class="field-error" role="alert">Mots de passe différents.</p>
                }
              </div>
            </div>

            <button
              type="submit"
              class="auth-submit-btn"
              [disabled]="authStore.loading()"
            >
              @if (authStore.loading()) {
                <span>Création du compte...</span>
              } @else {
                <span>Créer mon compte</span>
                <svg lucideArrowRight [size]="16" aria-hidden="true"></svg>
              }
            </button>
          </form>

          <footer class="auth-footer">
            <span>Déjà inscrit ?</span>
            <a routerLink="/connexion" class="auth-footer__link">Se connecter</a>
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
      padding: 18px 28px;
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
      max-width: 420px;
      margin: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 8px 0;
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
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background-color: #245b45;
      color: #ffffff;
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

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .input-icon-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 12px;
      color: var(--ink-muted);
      pointer-events: none;
    }

    .form-input {
      width: 100%;
      height: 44px;
      padding: 0 12px 0 36px;
      border-radius: 10px;
      border: 1px solid var(--border-strong);
      background-color: #f9fafb;
      font-family: var(--font-sans);
      font-size: 14px;
      color: var(--ink-primary);
    }

    .form-input--has-toggle {
      padding-right: 38px;
    }

    .form-input:focus {
      outline: 2px solid #245b45;
      outline-offset: 1px;
      background-color: #ffffff;
    }

    .password-toggle {
      position: absolute;
      right: 4px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
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
      margin-top: 2px;
      transition: background-color 140ms ease;
    }

    .auth-submit-btn:hover:not(:disabled) {
      background-color: #1c4736;
    }

    .auth-submit-btn:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .auth-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 13px;
      color: var(--ink-secondary);
      padding-top: 4px;
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

      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class RegisterPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly authStore = inject(AuthStore);

  protected readonly submitted = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly showConfirm = signal(false);
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
