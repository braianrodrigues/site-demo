import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';

import { AlvosApiService, AlvoListDTO } from './alvos-api.service';
import { ToastService } from '../../shared/ui/toast/toast.service';

import { jwtDecode } from 'jwt-decode';

type TokenPayload = {
  role?: string;
  roles?: string[] | string;
  authorities?: any;
  authority?: any;
  [key: string]: any;
};

@Component({
  selector: 'app-alvos-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  templateUrl: './alvos-list.component.html',
  styleUrls: ['./alvos-list.component.scss'],
})
export class AlvosListComponent {
  private api = inject(AlvosApiService);
  private router = inject(Router);
  private toast = inject(ToastService);

  displayedColumns = ['id', 'foto', 'nome', 'vulgo', 'cpf', 'cidade', 'estado', 'actions'];

  rows = signal<AlvoListDTO[]>([]);
  filteredRows = signal<AlvoListDTO[]>([]);

  page = signal(0);
  size = signal(10);
  total = signal(0);

  filterId = new FormControl<string>('', { nonNullable: true });
  filterNome = new FormControl<string>('', { nonNullable: true });
  filterVulgo = new FormControl<string>('', { nonNullable: true });
  filterCpf = new FormControl<string>('', { nonNullable: true });
  filterCidade = new FormControl<string>('', { nonNullable: true });
  filterUf = new FormControl<string>('', { nonNullable: true });

  currentRole = signal<string | null>(null);
  canDelete = signal<boolean>(false);

  constructor() {
    this.resolveCurrentRole();

    [
      this.filterId,
      this.filterNome,
      this.filterVulgo,
      this.filterCpf,
      this.filterCidade,
      this.filterUf,
    ].forEach((fc) =>
      fc.valueChanges.pipe(debounceTime(200)).subscribe(() => this.applyFilters())
    );

    this.load();
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
        const rows = (res.content ?? []).map((r) => ({
          ...r,
          fotoUrl: r.fotoUrl ? this.normalizeFotoUrl(r.fotoUrl) : r.fotoUrl,
        }));

        this.rows.set(rows);
        this.filteredRows.set(rows);
        this.page.set(res.page ?? 0);
        this.size.set(res.size ?? 10);
        this.total.set(res.totalElements ?? 0);
      },
      error: () => this.toast.error('Erro ao carregar lista de alvos.'),
    });
  }

  private normalizeFotoUrl(url: string): string {
    if (!url) return url;

    const absoluteUrl = url.startsWith('http')
      ? url
      : `http://localhost:8080${url}`;

    return `${absoluteUrl}${absoluteUrl.includes('?') ? '&' : '?'}v=1`;
  }

  private applyFilters() {
    const idFilter = this.filterId.value.toLowerCase().trim();
    const nome = this.filterNome.value.toLowerCase().trim();
    const vulgo = this.filterVulgo.value.toLowerCase().trim();
    const cpf = this.filterCpf.value.replace(/\D/g, '').trim();
    const cidade = this.filterCidade.value.toLowerCase().trim();
    const uf = this.filterUf.value.toUpperCase().trim();

    const filtered = this.rows().filter((r) => {
      const matchId = !idFilter || String(r.id ?? '').toLowerCase().includes(idFilter);
      const matchNome = !nome || (r.nome || '').toLowerCase().includes(nome);
      const matchVulgo = !vulgo || (r.vulgo || '').toLowerCase().includes(vulgo);
      const matchCpf = !cpf || (r.cpf || '').replace(/\D/g, '').includes(cpf);
      const matchCidade = !cidade || (r.cidade || '').toLowerCase().includes(cidade);
      const matchUf = !uf || (r.estado || '').toUpperCase().includes(uf);

      return matchId && matchNome && matchVulgo && matchCpf && matchCidade && matchUf;
    });

    this.filteredRows.set(filtered);
  }

  formatCpf(cpf: string | null | undefined): string {
    const d = (cpf ?? '').replace(/\D/g, '').padStart(11, '0').slice(-11);
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
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
    this.router.navigate(['/alvos/novo']);
  }

  editar(r: AlvoListDTO) {
    this.router.navigate(['/alvos', r.id, 'editar']);
  }

  visualizar(r: AlvoListDTO) {
    this.router.navigate(['/alvos', r.id, 'visualizar']);
  }

  excluir(r: AlvoListDTO) {
    if (!this.canDelete()) {
      this.toast.warn('Sem permissão para excluir.');
      return;
    }

    if (!confirm(`Confirma excluir o alvo "${r.nome}"?`)) return;

    this.api.delete(r.id).subscribe({
      next: () => {
        this.toast.success('Alvo excluído com sucesso.');
        this.load();
      },
      error: () => this.toast.error('Erro ao excluir alvo.'),
    });
  }
}