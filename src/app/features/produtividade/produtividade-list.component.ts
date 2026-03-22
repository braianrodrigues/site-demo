import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ToastService } from '../../shared/ui/toast/toast.service';
import {
  ProdutividadeApiService,
  ProdutividadeListDTO,
} from './produtividade-api.service';

import { jwtDecode } from 'jwt-decode';

type SnackState = {
  snack?: {
    type: 'success' | 'warn' | 'error';
    message: string;
  };
};

type TokenPayload = {
  role?: string;
  roles?: string[] | string;
  authorities?: any;
  authority?: any;
  [key: string]: any;
};

@Component({
  selector: 'app-produtividade-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './produtividade-list.component.html',
  styleUrls: ['./produtividade-list.component.scss'],
})
export class ProdutividadeListComponent {
  private api = inject(ProdutividadeApiService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  displayedColumns = [
    'id',
    'data',
    'natureza',
    'equipe',
    'envolvido',
    'cadastradoPor',
    'bopm',
    'bopc',
    'actions',
  ];

  rows = signal<ProdutividadeListDTO[]>([]);
  filteredRows = signal<ProdutividadeListDTO[]>([]);

  page = signal(0);
  size = signal(10);
  total = signal(0);

  filterId = new FormControl<string>('', { nonNullable: true });
  filterData = new FormControl<string>('', { nonNullable: true });
  filterNatureza = new FormControl<string>('', { nonNullable: true });
  filterEquipe = new FormControl<string>('', { nonNullable: true });
  filterEnvolvido = new FormControl<string>('', { nonNullable: true });
  filterCadastradoPor = new FormControl<string>('', { nonNullable: true });
  filterBopm = new FormControl<string>('', { nonNullable: true });
  filterBopc = new FormControl<string>('', { nonNullable: true });

  currentRole = signal<string | null>(null);

  readonly canDelete = signal<boolean>(false);

  constructor() {
    this.resolveCurrentRole();

    [
      this.filterId,
      this.filterData,
      this.filterNatureza,
      this.filterEquipe,
      this.filterEnvolvido,
      this.filterCadastradoPor,
      this.filterBopm,
      this.filterBopc,
    ].forEach((fc) =>
      fc.valueChanges.pipe(debounceTime(200)).subscribe(() => this.applyFilters())
    );

    this.consumeNavigationSnackState();
    this.load();
  }

  private consumeNavigationSnackState(): void {
    const s = (history.state ?? {}) as SnackState;
    if (!s?.snack?.message) return;

    const { type, message } = s.snack;

    if (type === 'success') this.toast.success(message);
    else if (type === 'warn') this.toast.warn(message);
    else this.toast.error(message);

    try {
      history.replaceState({}, document.title, this.router.url);
    } catch {
      
    }
  }

  private resolveCurrentRole(): void {
    const possibleKeys = [
      'sitear_auth_token',
      'token',
      'authToken',
      'access_token',
      'jwt',
    ];

    let rawStored: string | null = null;

    for (const k of possibleKeys) {
      const v = localStorage.getItem(k);
      if (v) {
        rawStored = v;
        break;
      }
    }

    let token: string | null = null;

    if (rawStored) {
      const trimmed = rawStored.trim();

      if (trimmed.startsWith('{')) {
        try {
          const parsed: any = JSON.parse(trimmed);
          token =
            parsed.accessToken ||
            parsed.token ||
            parsed.jwt ||
            parsed.value ||
            null;
        } catch {
          token = rawStored;
        }
      } else {
        token = rawStored;
      }
    }

    if (token && token.startsWith('Bearer ')) {
      token = token.substring(7);
    }

    if (!token) {
      this.currentRole.set(null);
      this.canDelete.set(false);
      return;
    }

    try {
      const payload = jwtDecode<TokenPayload>(token);

      const role = this.extractPrimaryRole(payload);
      this.currentRole.set(role);

      this.canDelete.set(
        role === 'GESTOR' ||
        role === 'ADMIN_OPERACIONAL' ||
        role === 'ADMIN_ADM'
      );
    } catch {
      this.currentRole.set(null);
      this.canDelete.set(false);
    }
  }

  private extractPrimaryRole(payload: TokenPayload): string | null {
    const candidates = [
      payload.role,
      payload.roles,
      payload.authorities,
      payload.authority,
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;

      if (Array.isArray(candidate) && candidate.length > 0) {
        const first = candidate[0];

        if (typeof first === 'string') {
          return first.replace(/^ROLE_/, '').toUpperCase();
        }

        if (first && typeof first === 'object') {
          const value =
            first.role ??
            first.authority ??
            first.name ??
            null;

          if (value) {
            return String(value).replace(/^ROLE_/, '').toUpperCase();
          }
        }
      }

      if (typeof candidate === 'string') {
        const first = candidate.split(',')[0]?.trim();
        if (first) {
          return first.replace(/^ROLE_/, '').toUpperCase();
        }
      }
    }

    return null;
  }

  load() {
    const q = '';
    this.api.list(q, this.page(), this.size()).subscribe({
      next: (res) => {
        const content = res.content ?? [];
        this.rows.set(content);
        this.filteredRows.set(content);
        this.page.set(res.page ?? 0);
        this.size.set(res.size ?? 10);
        this.total.set(res.totalElements ?? 0);
      },
      error: () => this.toast.error('Erro ao carregar lista de produtividades.'),
    });
  }

  private applyFilters() {
    const idFilter = this.filterId.value.toLowerCase().trim();
    const dataFilter = this.filterData.value.toLowerCase().trim();
    const natureza = this.filterNatureza.value.toLowerCase().trim();
    const equipe = this.filterEquipe.value.toLowerCase().trim();
    const envolvido = this.filterEnvolvido.value.toLowerCase().trim();
    const cadastradoPor = this.filterCadastradoPor.value.toLowerCase().trim();
    const bopm = this.filterBopm.value.toLowerCase().trim();
    const bopc = this.filterBopc.value.toLowerCase().trim();

    const filtered = this.rows().filter((r) => {
      const matchId =
        !idFilter || String(r.id ?? '').toLowerCase().includes(idFilter);

      const iso = String(r.data ?? '').toLowerCase();
      const br = this.formatDateBR(r.data).toLowerCase();

      const matchData =
        !dataFilter || iso.includes(dataFilter) || br.includes(dataFilter);

      const rawNat = String(r.natureza ?? '');
      const natView = this.formatNatureza(rawNat);

      const matchNatureza =
        !natureza ||
        rawNat.toLowerCase().includes(natureza) ||
        natView.toLowerCase().includes(natureza);

      const matchEquipe =
        !equipe || String(r.equipe ?? '').toLowerCase().includes(equipe);

      const matchEnvolvido =
        !envolvido ||
        String(r.primeiroEnvolvidoNome ?? '').toLowerCase().includes(envolvido);

      const matchCadastradoPor =
        !cadastradoPor ||
        String(r.cadastradoPorNome ?? '').toLowerCase().includes(cadastradoPor);

      const matchBopm =
        !bopm || String(r.bopm ?? '').toLowerCase().includes(bopm);

      const matchBopc =
        !bopc || String(r.bopc ?? '').toLowerCase().includes(bopc);

      return (
        matchId &&
        matchData &&
        matchNatureza &&
        matchEquipe &&
        matchEnvolvido &&
        matchCadastradoPor &&
        matchBopm &&
        matchBopc
      );
    });

    this.filteredRows.set(filtered);
  }

  formatDateBR(value: string | null | undefined): string {
    if (!value) return '—';

    const v = String(value).trim();

    const m1 = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m1) {
      const [, y, m, d] = m1;
      return `${d}/${m}/${y}`;
    }

    const dt = new Date(v);
    if (!isNaN(dt.getTime())) {
      const dd = String(dt.getDate()).padStart(2, '0');
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const yy = String(dt.getFullYear());
      return `${dd}/${mm}/${yy}`;
    }

    return v;
  }

  formatNatureza(n: string | null | undefined): string {
    const s = String(n ?? '').trim();
    if (!s) return '';

    return s
      .toLowerCase()
      .split('_')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  goPrev() {
    if (this.page() === 0) return;
    this.page.set(this.page() - 1);
    this.load();
  }

  goNext() {
    if ((this.page() + 1) * this.size() >= this.total()) return;
    this.page.set(this.page() + 1);
    this.load();
  }

  novo() {
    this.router.navigate(['../novo'], { relativeTo: this.route });
  }

  editar(r: ProdutividadeListDTO) {
    this.router.navigate(['../', r.id, 'editar'], { relativeTo: this.route });
  }

  visualizar(r: ProdutividadeListDTO) {
    this.router.navigate(['../', r.id, 'visualizar'], { relativeTo: this.route });
  }

  excluir(r: ProdutividadeListDTO) {
    if (!this.canDelete()) {
      this.toast.warn('Sem permissão para excluir.');
      return;
    }

    if (!confirm(`Confirma excluir a produtividade #${r.id}?`)) return;

    this.api.delete(r.id).subscribe({
      next: () => {
        this.toast.success('Produtividade excluída com sucesso.');
        this.load();
      },
      error: () => this.toast.error('Erro ao excluir produtividade.'),
    });
  }
}