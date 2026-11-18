import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type UiBadgeStatus =
  | 'publie'
  | 'brouillon'
  | 'en_attente'
  | 'confirme'
  | 'annule'
  | 'expire'
  | 'paye'
  | 'refuse'
  | 'utilise'
  | 'non_utilise'
  | 'valide'
  | 'rejete'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'mangrove'
  | 'terracotta'
  | 'ochre'
  | 'memorial';

const STATUS_LABELS: Record<string, string> = {
  publie: 'Publié',
  brouillon: 'Brouillon',
  en_attente: 'En attente',
  confirme: 'Confirmé',
  annule: 'Annulé',
  expire: 'Expiré',
  paye: 'Payé',
  refuse: 'Refusé',
  utilise: 'Utilisé',
  non_utilise: 'Non utilisé',
  valide: 'Validé',
  rejete: 'Rejeté',
  success: 'Succès',
  warning: 'Avertissement',
  danger: 'Erreur',
  info: 'Information',
  neutral: 'Neutre',
  mangrove: 'Mangrove',
  terracotta: 'Latérite',
  ochre: 'Ocre',
  memorial: 'Lieu de mémoire',
};

@Component({
  selector: 'app-ui-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <span [class]="badgeClasses()" role="status">
      @if (showDot()) {
        <span class="ui-badge__dot" aria-hidden="true"></span>
      }
      <span class="ui-badge__text">{{ displayLabel() }}</span>
      <ng-content></ng-content>
    </span>
  `,
  styles: `
    :host {
      display: inline-block;
    }

    .ui-badge__dot {
      width: 6px;
      height: 6px;
      border-radius: var(--radius-pill, 9999px);
      background-color: currentColor;
      flex-shrink: 0;
    }

    .ui-badge--sm {
      padding: 0.15rem 0.5rem;
      font-size: 0.7rem;
    }
  `,
})
export class UiBadgeComponent {
  readonly status = input<UiBadgeStatus>('neutral');
  readonly label = input<string>('');
  readonly showDot = input<boolean>(true);
  readonly size = input<'sm' | 'md'>('md');

  protected readonly displayLabel = computed(() => {
    if (this.label()) return this.label();
    const st = this.status();
    return STATUS_LABELS[st] || st;
  });

  protected readonly badgeClasses = computed(() => {
    const st = this.status().replace(/_/g, '-');
    const classes = ['ui-badge', `ui-badge--${st}`];
    if (this.size() === 'sm') classes.push('ui-badge--sm');
    return classes.join(' ');
  });
}
