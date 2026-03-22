// src/app/features/users/users-list.component.ts
import {
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { CommonModule, NgFor, NgIf } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Location } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ToastService } from '../../shared/ui/toast/toast.service';
import { UserDTO, UsersService } from './users.service';

import { jwtDecode } from 'jwt-decode';

interface TokenPayload {
  role?: string;
  roles?: string[];
  [key: string]: any;
}

@Component({
  selector: 'app-users-list',
  standalone: true,
  templateUrl: './users-list.component.html',
  styleUrls: ['./users-list.component.scss'],
  imports: [
    CommonModule,
    NgIf,
    NgFor,
    RouterLink,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatFormFieldModule,
    MatInputModule
  ]
})
export class UsersListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private usersService = inject(UsersService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private location = inject(Location);

  loading = signal(false);

  private rowsSignal = signal<UserDTO[]>([]);
  page = signal(0);
  size = signal(25);
  total = signal(0);

  search = '';

  viewingUser = signal<UserDTO | null>(null);

  editingUser = signal<UserDTO | null>(null);
  hideResetPassword = signal(true);
  savingPassword = signal(false);

  currentRole = signal<string | null>(null);
  readonly isGestor = computed(() => this.currentRole() === 'GESTOR');

  passwordForm: FormGroup = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  get pf() {
    return this.passwordForm.controls;
  }

  ngOnInit(): void {
    this.resolveCurrentRole();
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
          token = parsed.accessToken || parsed.token || parsed.jwt || parsed.value || null;
        } catch {
          token = rawStored;
        }
      } else {
        token = rawStored;
      }
    }

    if (token && token.startsWith('Bearer ')) token = token.substring(7);

    if (!token) {
      this.currentRole.set(null);
      return;
    }

    try {
      const decoded = jwtDecode<TokenPayload>(token);
      const roleClaim = decoded.role ?? decoded.roles;

      if (Array.isArray(roleClaim) && roleClaim.length > 0) {
        this.currentRole.set(String(roleClaim[0]).replace(/^ROLE_/, ''));
        return;
      }

      if (typeof roleClaim === 'string') {
        this.currentRole.set(roleClaim.replace(/^ROLE_/, ''));
        return;
      }

      this.currentRole.set(null);
    } catch (e) {
      console.warn('Erro ao decodificar token JWT', e);
      this.currentRole.set(null);
    }
  }

  users(): UserDTO[] {
    return this.rowsSignal();
  }

  load(): void {
    this.loading.set(true);

    this.usersService
      .listUsers({
        q: this.search,
        page: this.page(),
        size: this.size()
      })
      .subscribe({
        next: (page: any) => {
          this.rowsSignal.set(page.content ?? []);
          this.total.set(page.totalElements ?? (page.content?.length ?? 0));
          this.loading.set(false);
        },
        error: err => {
          console.error('Erro ao carregar usuários', err);
          this.toast.error('Falha ao carregar usuários cadastrados.');
          this.loading.set(false);
        }
      });
  }

  reloadFirstPage(): void {
    this.page.set(0);
    this.load();
  }

  goNext(): void {
    const currentPage = this.page();
    const pageSize = this.size();
    const totalElements = this.total();

    if ((currentPage + 1) * pageSize >= totalElements) return;

    this.page.set(currentPage + 1);
    this.load();
  }

  goPrev(): void {
    const currentPage = this.page();
    if (currentPage === 0) return;

    this.page.set(currentPage - 1);
    this.load();
  }

  changePageSize(size: number): void {
    this.size.set(size);
    this.page.set(0);
    this.load();
  }

  roleLabel(role: string | null | undefined): string {
    const r = String(role ?? '').toUpperCase();

    switch (r) {
      case 'GESTOR':
        return 'Gestor';
      case 'ADMIN_OPERACIONAL':
        return 'Admin Operacional';
      case 'ADMIN_ADM':
        return 'Admin ADM';
      case 'USUARIO_NIVEL_I':
        return 'Usuário Nível I';
      case 'USUARIO_NIVEL_II':
        return 'Usuário Nível II';
      default:
        return r || '—';
    }
  }

  areaLabel(area: string | null | undefined): string {
    const a = String(area ?? '').toUpperCase();

    switch (a) {
      case 'OPERACIONAL':
        return 'Operacional';
      case 'ADMINISTRATIVO':
        return 'Administrativo';
      case 'AMBOS':
        return 'Ambos';
      default:
        return a || '—';
    }
  }

  roleClass(role: string | null | undefined): string {
    const r = String(role ?? '').toUpperCase();

    if (r === 'GESTOR') return 'gestor';
    if (r === 'ADMIN_OPERACIONAL') return 'admin-operacional';
    if (r === 'ADMIN_ADM') return 'admin-adm';
    if (r === 'USUARIO_NIVEL_I') return 'nivel-i';
    if (r === 'USUARIO_NIVEL_II') return 'nivel-ii';

    return '';
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

  openViewModal(u: UserDTO): void {
    this.viewingUser.set(u);
  }

  closeViewModal(): void {
    this.viewingUser.set(null);
  }

  goToNew(): void {
    if (!this.isGestor()) {
      this.toast.error('Somente o Gestor pode cadastrar usuários.');
      return;
    }

    this.router.navigate(['/usuarios/novo']);
  }

  deleteUser(u: UserDTO): void {
    if (!this.isGestor()) {
      this.toast.error('Somente o Gestor pode excluir usuários.');
      return;
    }

    const ok = confirm(`Deseja realmente excluir o usuário "${u.username}"?`);
    if (!ok || !u.id) return;

    this.loading.set(true);
    this.usersService.deleteUser(u.id).subscribe({
      next: () => {
        this.toast.success('Usuário excluído com sucesso.');
        this.rowsSignal.set(this.rowsSignal().filter(x => x.id !== u.id));
        this.loading.set(false);

        if (this.editingUser()?.id === u.id) {
          this.closePasswordModal();
        }

        if (this.viewingUser()?.id === u.id) {
          this.closeViewModal();
        }
      },
      error: err => {
        console.error('Erro ao excluir usuário', err);
        this.toast.error('Erro ao excluir usuário.');
        this.loading.set(false);
      }
    });
  }

  openPasswordModal(u: UserDTO): void {
    if (!this.isGestor()) {
      this.toast.error('Somente o Gestor pode redefinir senha.');
      return;
    }

    this.editingUser.set(u);
    this.hideResetPassword.set(true);
    this.savingPassword.set(false);
    this.passwordForm.reset({ password: '' });
  }

  closePasswordModal(): void {
    this.editingUser.set(null);
    this.hideResetPassword.set(true);
    this.savingPassword.set(false);
    this.passwordForm.reset({ password: '' });
  }

  submitPassword(): void {
    const current = this.editingUser();
    if (!current || !current.id) {
      this.toast.error('Usuário inválido para redefinição de senha.');
      return;
    }

    if (!this.isGestor()) {
      this.toast.error('Somente o Gestor pode redefinir senha.');
      return;
    }

    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      this.toast.error('Informe uma senha válida (mínimo 6 caracteres).');
      return;
    }

    const newPassword = this.passwordForm.value.password as string;

    this.savingPassword.set(true);

    this.usersService
      .resetPassword(current.id, newPassword)
      .subscribe({
        next: () => {
          this.toast.success('Senha redefinida com sucesso.');
          this.savingPassword.set(false);
          this.closePasswordModal();
        },
        error: err => {
          console.error('Erro ao redefinir senha', err);
          this.toast.error('Erro ao redefinir senha do usuário.');
          this.savingPassword.set(false);
        }
      });
  }

  goBack(): void {
    this.location.back();
  }
}