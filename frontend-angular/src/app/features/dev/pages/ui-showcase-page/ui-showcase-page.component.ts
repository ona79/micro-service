import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucidePlus, LucideSettings } from '@lucide/angular';
import { UiBadgeComponent } from '../../../../shared/components/ui-badge/ui-badge.component';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button.component';
import { UiCardComponent } from '../../../../shared/components/ui-card/ui-card.component';
import {
  UiDataTableComponent,
  UiTableColumn,
  UiTableRowAction,
} from '../../../../shared/components/ui-data-table/ui-data-table.component';
import { UiDrawerComponent } from '../../../../shared/components/ui-drawer/ui-drawer.component';
import { UiFilterBarComponent } from '../../../../shared/components/ui-filter-bar/ui-filter-bar.component';
import { UiFormFieldComponent } from '../../../../shared/components/ui-form-field/ui-form-field.component';
import { UiKpiCardComponent } from '../../../../shared/components/ui-kpi-card/ui-kpi-card.component';
import { UiModalComponent } from '../../../../shared/components/ui-modal/ui-modal.component';
import { UiPageHeaderComponent } from '../../../../shared/components/ui-page-header/ui-page-header.component';
import { UiTabItem, UiTabsComponent } from '../../../../shared/components/ui-tabs/ui-tabs.component';

interface DemoRow {
  id: number;
  nom: string;
  zone: string;
  statut: string;
}

@Component({
  selector: 'app-ui-showcase-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    LucidePlus,
    LucideSettings,
    UiPageHeaderComponent,
    UiButtonComponent,
    UiCardComponent,
    UiBadgeComponent,
    UiKpiCardComponent,
    UiTabsComponent,
    UiFilterBarComponent,
    UiFormFieldComponent,
    UiDataTableComponent,
    UiModalComponent,
    UiDrawerComponent,
  ],
  template: `
    <div class="container page-section dev-ui">
      <app-ui-page-header
        eyebrow="Design System — Terre, Mangrove & Lin"
        title="Catalogue des composants UI (/dev/ui)"
        subtitle="Composants partagés Angular 22, densité compacte (14px) / confortable (15px), mobile-first."
        [breadcrumbs]="[{ label: 'Accueil', to: '/' }, { label: 'UI Kit' }]"
      >
        <div header-actions>
          <app-ui-button variant="secondary" size="sm" (clicked)="drawerOpen.set(true)">
            Ouvrir Drawer
          </app-ui-button>
          <app-ui-button variant="primary" size="md" (clicked)="modalOpen.set(true)">
            <svg lucidePlus [size]="15" aria-hidden="true"></svg>
            Ouvrir Modal
          </app-ui-button>
        </div>
      </app-ui-page-header>

      <section class="dev-ui__section">
        <h2>1. Boutons (ui-button)</h2>
        <div class="dev-ui__row">
          <app-ui-button variant="primary" size="md">Primary md</app-ui-button>
          <app-ui-button variant="secondary" size="md">Secondary md</app-ui-button>
          <app-ui-button variant="ghost" size="md">Ghost md</app-ui-button>
          <app-ui-button variant="danger" size="md">Danger md</app-ui-button>
          <app-ui-button variant="primary" size="sm">Primary sm</app-ui-button>
          <app-ui-button variant="icon" size="md" ariaLabel="Paramètres">
            <svg lucideSettings [size]="16" aria-hidden="true"></svg>
          </app-ui-button>
        </div>
      </section>

      <section class="dev-ui__section">
        <h2>2. Cartes KPI compactes (ui-kpi-card) &amp; Cartes (ui-card)</h2>
        <div class="dev-ui__grid-kpi">
          <app-ui-kpi-card label="Sites publiés" [value]="8" subtitle="Casamance" tone="forest" />
          <app-ui-kpi-card label="Circuits actifs" [value]="2" subtitle="Guides agréés" tone="terracotta" />
          <app-ui-kpi-card label="Événements" [value]="3" subtitle="À venir" tone="ochre" />
        </div>
        <div class="dev-ui__grid-cards">
          <app-ui-card variant="elevated">
            <div card-header>
              <app-ui-badge tone="forest">Elevated</app-ui-badge>
            </div>
            <p>Carte standard avec padding 16px et rayon 12px.</p>
          </app-ui-card>
          <app-ui-card variant="bordered" [interactive]="true">
            <div card-header>
              <app-ui-badge tone="terracotta">Interactive</app-ui-badge>
            </div>
            <p>Carte cliquable avec état hover net.</p>
          </app-ui-card>
        </div>
      </section>

      <section class="dev-ui__section">
        <h2>3. Onglets à compteurs (ui-tabs) &amp; Barre de filtres (ui-filter-bar)</h2>
        <app-ui-filter-bar
          searchPlaceholder="Rechercher un site..."
          [searchValue]="search()"
          [statusPills]="tabs"
          [activeStatus]="activeTab()"
          [hasSecondaryFilters]="true"
          [hasActiveFilters]="!!search()"
          (searchChange)="search.set($event)"
          (statusChange)="activeTab.set($event)"
        >
          <div filter-secondary class="dev-ui__row">
            <select class="ui-filter-control" aria-label="Zone">
              <option value="">Toutes les zones</option>
              <option value="ZIGUINCHOR">Ziguinchor</option>
            </select>
          </div>
        </app-ui-filter-bar>
      </section>

      <section class="dev-ui__section">
        <h2>4. Tableau de données (ui-data-table)</h2>
        <app-ui-data-table
          [columns]="columns"
          [rows]="rows"
          [selectable]="true"
          primaryActionLabel="Consulter"
          [menuActions]="menuActions"
          [page]="0"
          [pageSize]="12"
          [totalElements]="rows.length"
          [totalPages]="1"
        />
      </section>

      <section class="dev-ui__section">
        <h2>5. Champs de formulaire (ui-form-field)</h2>
        <div class="bo-form-grid">
          <app-ui-form-field label="Nom du site" forId="demo-nom" [required]="true" hint="Nom officiel du patrimoine">
            <input id="demo-nom" type="text" placeholder="Ex. Île de Carabane" [(ngModel)]="demoName" />
          </app-ui-form-field>
          <app-ui-form-field label="Champ en erreur" forId="demo-err" error="Ce champ est obligatoire.">
            <input id="demo-err" type="text" placeholder="Valeur invalide" />
          </app-ui-form-field>
        </div>
      </section>

      <app-ui-modal
        [open]="modalOpen()"
        title="Exemple de Modal (<= 8 champs)"
        subtitle="Largeur max 560px, grille 2 colonnes, focus trap"
        (closed)="modalOpen.set(false)"
        (submitted)="modalOpen.set(false)"
      >
        <div class="bo-form-grid">
          <app-ui-form-field label="Libellé" forId="m-lib" [required]="true">
            <input id="m-lib" type="text" placeholder="Libellé court" />
          </app-ui-form-field>
          <app-ui-form-field label="Zone" forId="m-zone">
            <select id="m-zone">
              <option>Basse-Casamance</option>
              <option>Moyenne-Casamance</option>
            </select>
          </app-ui-form-field>
        </div>
      </app-ui-modal>

      <app-ui-drawer
        [open]="drawerOpen()"
        title="Exemple de Drawer latéral"
        subtitle="Largeur 560-720px, plein écran sur mobile"
        (closed)="drawerOpen.set(false)"
        (submitted)="drawerOpen.set(false)"
      >
        <p>Contenu détaillé d'une fiche longue dans le panneau latéral.</p>
      </app-ui-drawer>
    </div>
  `,
  styles: `
    .dev-ui__section {
      margin-bottom: var(--space-6, 24px);
    }

    .dev-ui__section h2 {
      margin-bottom: var(--space-3, 12px);
    }

    .dev-ui__row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2, 8px);
    }

    .dev-ui__grid-kpi {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
      gap: var(--space-3, 12px);
      margin-bottom: var(--space-3, 12px);
    }

    .dev-ui__grid-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
      gap: var(--space-3, 12px);
    }
  `,
})
export class UiShowcasePageComponent {
  protected readonly modalOpen = signal(false);
  protected readonly drawerOpen = signal(false);
  protected readonly search = signal('');
  protected readonly activeTab = signal('ALL');
  protected demoName = '';

  protected readonly tabs: UiTabItem[] = [
    { id: 'ALL', label: 'Tous', count: 3 },
    { id: 'PUBLIE', label: 'Publiés', count: 2 },
    { id: 'BROUILLON', label: 'Brouillons', count: 1 },
  ];

  protected readonly columns: UiTableColumn<DemoRow>[] = [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'nom', label: 'Site patrimonial', sortable: true },
    { key: 'zone', label: 'Zone' },
    { key: 'statut', label: 'Statut' },
  ];

  protected readonly rows: DemoRow[] = [
    { id: 1, nom: 'Île de Carabane', zone: 'Basse-Casamance', statut: 'PUBLIE' },
    { id: 2, nom: 'Cases à Impluvium d’Enampore', zone: 'Ziguinchor', statut: 'PUBLIE' },
    { id: 3, nom: 'Fort de Sédhiou', zone: 'Moyenne-Casamance', statut: 'BROUILLON' },
  ];

  protected readonly menuActions: UiTableRowAction<DemoRow>[] = [
    { id: 'edit', label: 'Éditer' },
    { id: 'archive', label: 'Archiver', tone: 'danger' },
  ];
}
