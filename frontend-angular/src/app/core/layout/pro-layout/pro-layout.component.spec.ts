import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from '../../auth/auth.store';
import { RoleUtilisateur, Utilisateur } from '../../models/utilisateur.model';
import { NotificationStore } from '../../../features/notifications/data-access/notification.store';
import { ProLayoutComponent } from './pro-layout.component';

function buildUser(role: RoleUtilisateur): Utilisateur {
  return {
    id: 1,
    prenom: 'Test',
    nom: role,
    email: `${role.toLowerCase()}@uasz.sn`,
    telephone: null,
    role,
    actif: true,
    dateInscription: null,
  };
}

describe('ProLayoutComponent (Role-Scoped Sidebar Navigation)', () => {
  const userSig = signal<Utilisateur | null>(null);
  const roleLabelSig = signal('');

  beforeEach(async () => {
    userSig.set(null);
    roleLabelSig.set('');

    await TestBed.configureTestingModule({
      imports: [ProLayoutComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthStore,
          useValue: {
            user: userSig.asReadonly(),
            roleLabel: roleLabelSig.asReadonly(),
            initials: () => 'TE',
            logout: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: NotificationStore,
          useValue: {
            unreadCount: signal(2).asReadonly(),
            refreshUnreadCount: vi.fn().mockResolvedValue(2),
          },
        },
      ],
    }).compileComponents();
  });

  function navTexts(fixture: ReturnType<typeof TestBed.createComponent<ProLayoutComponent>>): string {
    return (fixture.nativeElement.querySelector('.pro-nav')?.textContent ?? '') as string;
  }

  it('shows all domains including Paiements and Utilisateurs & Audit to ADMINISTRATEUR', () => {
    userSig.set(buildUser('ADMINISTRATEUR'));
    roleLabelSig.set('Administrateur');
    const fixture = TestBed.createComponent(ProLayoutComponent);
    fixture.detectChanges();

    const text = navTexts(fixture);
    expect(text).toContain('Patrimoines');
    expect(text).toContain('Circuits');
    expect(text).toContain('Événements');
    expect(text).toContain('Guides touristiques');
    expect(text).toContain('Modération & Avis');
    expect(text).toContain('Réservations');
    expect(text).toContain('Paiements simulés');
    expect(text).toContain('Utilisateurs & Audit');
    expect(text).not.toContain('Mon profil guide');
  });

  it('restricts CONSERVATEUR strictly to dashboard, stats, patrimoines and notifications', () => {
    userSig.set(buildUser('CONSERVATEUR'));
    roleLabelSig.set('Conservateur du patrimoine');
    const fixture = TestBed.createComponent(ProLayoutComponent);
    fixture.detectChanges();

    const text = navTexts(fixture);
    expect(text).toContain('Tableau de bord');
    expect(text).toContain('Patrimoines');
    expect(text).toContain('Notifications');
    expect(text).not.toContain('Paiements simulés');
    expect(text).not.toContain('Utilisateurs & Audit');
    expect(text).not.toContain('Réservations');
    expect(text).not.toContain('Modération & Avis');
  });

  it('shows Lecture badge on Patrimoines and hides Paiements / Utilisateurs for GESTIONNAIRE_SITE', () => {
    userSig.set(buildUser('GESTIONNAIRE_SITE'));
    roleLabelSig.set('Gestionnaire de site');
    const fixture = TestBed.createComponent(ProLayoutComponent);
    fixture.detectChanges();

    const text = navTexts(fixture);
    expect(text).toContain('Patrimoines');
    expect(text).toContain('Lecture');
    expect(text).toContain('Circuits');
    expect(text).toContain('Événements');
    expect(text).toContain('Guides touristiques');
    expect(text).toContain('Réservations');
    expect(text).toContain('Modération & Avis');
    expect(text).not.toContain('Paiements simulés');
    expect(text).not.toContain('Utilisateurs & Audit');
  });

  it('scopes GUIDE strictly to Mon profil guide, Mes circuits, Manifestes and Notifications', () => {
    userSig.set(buildUser('GUIDE'));
    roleLabelSig.set('Guide touristique local');
    const fixture = TestBed.createComponent(ProLayoutComponent);
    fixture.detectChanges();

    const text = navTexts(fixture);
    expect(text).toContain('Mon profil guide');
    expect(text).toContain('Mes circuits');
    expect(text).toContain('Manifestes circuits');
    expect(text).toContain('Notifications');
    expect(text).not.toContain('Patrimoines');
    expect(text).not.toContain('Paiements simulés');
    expect(text).not.toContain('Utilisateurs & Audit');
  });
});
