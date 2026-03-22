// src/app/features/users/users-create.component.ts
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
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ToastService } from '../../shared/ui/toast/toast.service';
import {
  AreaAcesso,
  CreateUserRequest,
  UserDTO,
  UserRole,
  UsersService
} from './users.service';

import { jwtDecode } from 'jwt-decode';

type TokenPayload = {
  role?: string;
  roles?: string[];
  areaAcesso?: string;
  [key: string]: any;
};

@Component({
  selector: 'app-users-create',
  standalone: true,
  templateUrl: './users-create.component.html',
  styleUrls: ['./users-create.component.scss'],
  imports: [
    CommonModule,
    NgIf,
    NgFor,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatProgressBarModule,
    MatTooltipModule
  ]
})
export class UsersCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private usersService = inject(UsersService);
  private toast = inject(ToastService);

  loading = signal(false);

  private usersSignal = signal<UserDTO[]>([]);
  totalUsers = signal(0);

  editingUser = signal<UserDTO | null>(null);
  hideResetPassword = signal(true);
  savingPassword = signal(false);

  currentRole = signal<string | null>(null);

  readonly roleOptions: UserRole[] = [
    'GESTOR',
    'ADMIN_OPERACIONAL',
    'ADMIN_ADM',
    'USUARIO_NIVEL_I',
    'USUARIO_NIVEL_II'
  ];

  readonly areaOptions: AreaAcesso[] = [
    'OPERACIONAL',
    'ADMINISTRATIVO',
    'AMBOS'
  ];

  readonly isGestor = computed(() => this.currentRole() === 'GESTOR');

  form: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(3)]],
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.pattern(/^[a-zA-Z0-9._-]+$/)
      ]
    ],
    email: ['', [Validators.email]],
    telefone: [''],
    endereco: [''],
    dataNascimento: [''],
    role: ['USUARIO_NIVEL_II', [Validators.required]],
    areaAcesso: ['OPERACIONAL', [Validators.required]]
  });

  passwordForm: FormGroup = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  get f(): any {
    return this.form.controls;
  }

  get pf(): any {
    return this.passwordForm.controls;
  }

  ngOnInit(): void {
    this.resolveCurrentRole();

    if (!this.isGestor()) {
      this.toast.error('Somente o Gestor pode cadastrar usuários.');
    }

    this.bindRoleAreaRule();
    this.loadUsers();
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
      return;
    }

    try {
      const payload = jwtDecode<TokenPayload>(token);
      const roleClaim = payload.role ?? payload.roles;

      if (Array.isArray(roleClaim) && roleClaim.length > 0) {
        const value = String(roleClaim[0]).replace(/^ROLE_/, '');
        this.currentRole.set(value);
        return;
      }

      if (typeof roleClaim === 'string') {
        this.currentRole.set(roleClaim.replace(/^ROLE_/, ''));
        return;
      }

      this.currentRole.set(null);
    } catch {
      this.currentRole.set(null);
    }
  }

  private bindRoleAreaRule(): void {
    this.form.get('role')?.valueChanges.subscribe((role: UserRole) => {
      const areaCtrl = this.form.get('areaAcesso');

      if (!areaCtrl) return;

      if (role === 'GESTOR') {
        areaCtrl.setValue('AMBOS', { emitEvent: false });
        areaCtrl.disable({ emitEvent: false });
        return;
      }

      if (role === 'ADMIN_OPERACIONAL') {
        areaCtrl.setValue('OPERACIONAL', { emitEvent: false });
        areaCtrl.disable({ emitEvent: false });
        return;
      }

      if (role === 'ADMIN_ADM') {
        areaCtrl.setValue('ADMINISTRATIVO', { emitEvent: false });
        areaCtrl.disable({ emitEvent: false });
        return;
      }

      areaCtrl.enable({ emitEvent: false });

      if (!areaCtrl.value) {
        areaCtrl.setValue('OPERACIONAL', { emitEvent: false });
      }
    });

    const current = this.form.get('role')?.value as UserRole;
    if (current) {
      this.form.get('role')?.setValue(current);
    }
  }

  users(): UserDTO[] {
    return this.usersSignal();
  }

  loadUsers(): void {
    this.loading.set(true);

    this.usersService
      .listUsers({ page: 0, size: 50 })
      .subscribe({
        next: (page: any) => {
          const content: UserDTO[] = Array.isArray(page)
            ? page
            : (page.content ?? []);

          const total: number = Array.isArray(page)
            ? content.length
            : (page.totalElements ?? content.length);

          this.usersSignal.set(content);
          this.totalUsers.set(total);
          this.loading.set(false);
        },
        error: err => {
          console.error('Erro ao carregar usuários', err);
          this.toast.error('Falha ao carregar usuários cadastrados.');
          this.loading.set(false);
        }
      });
  }

  save(): void {
    if (!this.isGestor()) {
      this.toast.error('Somente o Gestor pode cadastrar usuários.');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    const raw = this.form.getRawValue();

    const payload: CreateUserRequest = {
      fullName: String(raw.fullName ?? '').trim(),
      username: String(raw.username ?? '').trim().toLowerCase(),
      email: String(raw.email ?? '').trim() || null,
      telefone: String(raw.telefone ?? '').trim() || null,
      endereco: String(raw.endereco ?? '').trim() || null,
      dataNascimento: raw.dataNascimento || null,
      role: String(raw.role ?? 'USUARIO_NIVEL_II').toUpperCase() as UserRole,
      areaAcesso: String(raw.areaAcesso ?? 'OPERACIONAL').toUpperCase() as AreaAcesso,
      enabled: true
    } as any;

    this.loading.set(true);

    this.usersService.createUser(payload).subscribe({
      next: created => {
        this.toast.success('Usuário criado com sucesso. Senha inicial: 123456');
        this.usersSignal.set([created, ...this.usersSignal()]);
        this.totalUsers.set(this.totalUsers() + 1);

        this.form.reset({
          fullName: '',
          username: '',
          email: '',
          telefone: '',
          endereco: '',
          dataNascimento: '',
          role: 'USUARIO_NIVEL_II',
          areaAcesso: 'OPERACIONAL'
        });

        this.loading.set(false);
      },
      error: err => {
        console.error('Erro ao salvar usuário', err);
        this.toast.error(err.error?.message || 'Erro ao salvar usuário.');
        this.loading.set(false);
      }
    });
  }

  clear(): void {
    this.form.reset({
      fullName: '',
      username: '',
      email: '',
      telefone: '',
      endereco: '',
      dataNascimento: '',
      role: 'USUARIO_NIVEL_II',
      areaAcesso: 'OPERACIONAL'
    });
  }

  deleteUser(u: UserDTO): void {
    if (!this.isGestor()) {
      this.toast.error('Somente o Gestor pode excluir usuários.');
      return;
    }

    const ok = confirm(`Deseja realmente excluir o usuário "${u.fullName}"?`);
    if (!ok) return;

    this.loading.set(true);
    this.usersService.deleteUser(u.id).subscribe({
      next: () => {
        this.toast.success('Usuário excluído com sucesso.');
        this.usersSignal.set(this.usersSignal().filter(x => x.id !== u.id));
        this.totalUsers.set(Math.max(0, this.totalUsers() - 1));

        if (this.editingUser()?.id === u.id) {
          this.closePasswordModal();
        }

        this.loading.set(false);
      },
      error: err => {
        console.error('Erro ao excluir usuário', err);
        this.toast.error('Erro ao excluir usuário.');
        this.loading.set(false);
      }
    });
  }

  openPasswordModal(u: UserDTO): void {
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

    this.usersService.resetPassword(current.id, newPassword).subscribe({
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
}