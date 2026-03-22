import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../environments/environment';

export type UserRole =
  | 'GESTOR'
  | 'ADMIN_OPERACIONAL'
  | 'ADMIN_ADM'
  | 'USUARIO_NIVEL_I'
  | 'USUARIO_NIVEL_II';

export type AreaAcesso =
  | 'OPERACIONAL'
  | 'ADMINISTRATIVO'
  | 'AMBOS';

export type LoginUser = {
  id: number;
  username: string;
  fullName: string;
  role: UserRole | string;
  areaAcesso: AreaAcesso | string;
  precisaTrocarSenha?: boolean;
};

export type LoginResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: LoginUser;
};

type JwtPayload = {
  sub?: string;
  role?: string;
  roles?: string[] | string;
  areaAcesso?: string;
  userId?: number;
  fullName?: string;
  precisaTrocarSenha?: boolean;
  exp?: number;
  iat?: number;
  [key: string]: any;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly TOKEN_KEY = 'sitear_auth_token';
  private readonly DEMO_MODE = true;

  // estado reativo
  private readonly _token = signal<string | null>(this.readToken());
  private readonly _user = signal<LoginUser | null>(
    this.readUserFromToken(this._token())
  );

  readonly token = computed(() => this._token());
  readonly user = computed(() => this._user());
  readonly isAuthenticated = computed(() => !!this._token() && !!this._user());

  // =============================
  // LOGIN
  // =============================
  login(username: string, password: string): Observable<LoginResponse> {
    if (this.DEMO_MODE) {
      const mock = this.buildDemoLogin(username, password);

      if (!mock) {
        return new Observable<LoginResponse>((subscriber) => {
          subscriber.error(new Error('Usuário ou senha inválidos.'));
        });
      }

      return of(mock).pipe(
        tap((res) => {
          this.setSession(res.accessToken, res.user);
        })
      );
    }

    return this.http
      .post<LoginResponse>(`${environment.API_URL}/api/auth/login`, {
        username,
        password,
      })
      .pipe(
        tap((res) => {
          this.setSession(res.accessToken, res.user);
        })
      );
  }

  // =============================
  // LOGOUT
  // =============================
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  // =============================
  // GETTERS
  // =============================
  getToken(): string | null {
    return this._token();
  }

  getCurrentUserId(): number | null {
    return this._user()?.id ?? null;
  }

  getCurrentUserName(): string {
    return this._user()?.fullName ?? '';
  }

  getCurrentRole(): UserRole | string | null {
    const role = this._user()?.role;
    return role ? String(role).replace(/^ROLE_/, '') : null;
  }

  getCurrentAreaAcesso(): AreaAcesso | string | null {
    const area = this._user()?.areaAcesso;
    return area ? String(area).toUpperCase() : null;
  }

  // =============================
  // PERMISSÕES
  // =============================
  hasRole(...roles: string[]): boolean {
    const current = String(this.getCurrentRole() ?? '').toUpperCase();
    return roles.map((r) => r.toUpperCase()).includes(current);
  }

  hasAnyRole(roles: string[]): boolean {
    const current = String(this.getCurrentRole() ?? '').toUpperCase();
    return roles.map((r) => r.toUpperCase()).includes(current);
  }

  isGestor(): boolean {
    return this.hasRole('GESTOR');
  }

  canManageUsers(): boolean {
    return this.hasAnyRole(['GESTOR', 'ADMIN_ADM']);
  }

  canAccessOperacional(): boolean {
    const area = String(this.getCurrentAreaAcesso() ?? '').toUpperCase();
    return this.isGestor() || area === 'OPERACIONAL' || area === 'AMBOS';
  }

  canAccessAdministrativo(): boolean {
    const area = String(this.getCurrentAreaAcesso() ?? '').toUpperCase();
    return this.isGestor() || area === 'ADMINISTRATIVO' || area === 'AMBOS';
  }

  canDeleteProdutividade(): boolean {
    return this.hasAnyRole(['GESTOR', 'ADMIN_OPERACIONAL']);
  }

  canDeleteAlvos(): boolean {
    return this.hasAnyRole(['GESTOR', 'ADMIN_OPERACIONAL']);
  }

  precisaTrocarSenha(): boolean {
    return this.user()?.precisaTrocarSenha === true;
  }

  marcarSenhaComoAtualizada(): void {
    const current = this._user();
    if (!current) return;

    this._user.set({
      ...current,
      precisaTrocarSenha: false,
    });
  }

  // =============================
  // SESSION
  // =============================
  private setSession(token: string, user?: LoginUser | null): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    this._token.set(token);

    if (user) {
      this._user.set({
        ...user,
        role: String(user.role).replace(/^ROLE_/, ''),
        areaAcesso: String(user.areaAcesso ?? 'OPERACIONAL').toUpperCase(),
        precisaTrocarSenha: user.precisaTrocarSenha === true,
      });
      return;
    }

    this._user.set(this.readUserFromToken(token));
  }

  // =============================
  // TOKEN STORAGE
  // =============================
  private readToken(): string | null {
    const raw = localStorage.getItem(this.TOKEN_KEY);
    if (!raw) return null;
    return raw.startsWith('Bearer ') ? raw.substring(7) : raw;
  }

  // =============================
  // JWT PARSER
  // =============================
  private readUserFromToken(token: string | null): LoginUser | null {
    if (!token) return null;

    if (token.startsWith('demo-token-')) {
      return this.readDemoUserFromToken(token);
    }

    try {
      const payload = jwtDecode<JwtPayload>(token);

      const role =
        typeof payload.role === 'string'
          ? payload.role.replace(/^ROLE_/, '')
          : Array.isArray(payload.roles) && payload.roles.length > 0
          ? String(payload.roles[0]).replace(/^ROLE_/, '')
          : typeof payload.roles === 'string'
          ? payload.roles.replace(/^ROLE_/, '')
          : null;

      const user: LoginUser = {
        id: Number(payload.userId ?? 0),
        username: String(payload.sub ?? ''),
        fullName: String(payload.fullName ?? ''),
        role: String(role ?? ''),
        areaAcesso: String(payload.areaAcesso ?? 'OPERACIONAL').toUpperCase(),
        precisaTrocarSenha: payload.precisaTrocarSenha === true,
      };

      if (!user.username) return null;

      return user;
    } catch {
      localStorage.removeItem(this.TOKEN_KEY);
      return null;
    }
  }

  // =============================
  // DEMO MODE
  // =============================
  private buildDemoLogin(
    username: string,
    password: string
  ): LoginResponse | null {
    const user = String(username ?? '').trim().toLowerCase();
    const pass = String(password ?? '').trim();

    if (pass !== '123456') {
      return null;
    }

    const users: Record<string, LoginUser> = {
      admin: {
        id: 1,
        username: 'admin',
        fullName: 'Administrador Demo',
        role: 'GESTOR',
        areaAcesso: 'AMBOS',
        precisaTrocarSenha: false,
      },
      gestor: {
        id: 2,
        username: 'gestor',
        fullName: 'Gestor Demo',
        role: 'GESTOR',
        areaAcesso: 'AMBOS',
        precisaTrocarSenha: false,
      },
      adm: {
        id: 3,
        username: 'adm',
        fullName: 'Administrador Administrativo',
        role: 'ADMIN_ADM',
        areaAcesso: 'ADMINISTRATIVO',
        precisaTrocarSenha: false,
      },
      operacional: {
        id: 4,
        username: 'operacional',
        fullName: 'Administrador Operacional',
        role: 'ADMIN_OPERACIONAL',
        areaAcesso: 'OPERACIONAL',
        precisaTrocarSenha: false,
      },
      usuario1: {
        id: 5,
        username: 'usuario1',
        fullName: 'Usuário Nível I',
        role: 'USUARIO_NIVEL_I',
        areaAcesso: 'OPERACIONAL',
        precisaTrocarSenha: false,
      },
      usuario2: {
        id: 6,
        username: 'usuario2',
        fullName: 'Usuário Nível II',
        role: 'USUARIO_NIVEL_II',
        areaAcesso: 'ADMINISTRATIVO',
        precisaTrocarSenha: false,
      },
    };

    const selectedUser = users[user];

    if (!selectedUser) {
      return null;
    }

    return {
      accessToken: `demo-token-${selectedUser.username}`,
      tokenType: 'Bearer',
      expiresIn: 3600,
      user: selectedUser,
    };
  }

  private readDemoUserFromToken(token: string): LoginUser | null {
    const username = token.replace('demo-token-', '').trim().toLowerCase();

    const users: Record<string, LoginUser> = {
      admin: {
        id: 1,
        username: 'admin',
        fullName: 'Administrador Demo',
        role: 'GESTOR',
        areaAcesso: 'AMBOS',
        precisaTrocarSenha: false,
      },
      gestor: {
        id: 2,
        username: 'gestor',
        fullName: 'Gestor Demo',
        role: 'GESTOR',
        areaAcesso: 'AMBOS',
        precisaTrocarSenha: false,
      },
      adm: {
        id: 3,
        username: 'adm',
        fullName: 'Administrador Administrativo',
        role: 'ADMIN_ADM',
        areaAcesso: 'ADMINISTRATIVO',
        precisaTrocarSenha: false,
      },
      operacional: {
        id: 4,
        username: 'operacional',
        fullName: 'Administrador Operacional',
        role: 'ADMIN_OPERACIONAL',
        areaAcesso: 'OPERACIONAL',
        precisaTrocarSenha: false,
      },
      usuario1: {
        id: 5,
        username: 'usuario1',
        fullName: 'Usuário Nível I',
        role: 'USUARIO_NIVEL_I',
        areaAcesso: 'OPERACIONAL',
        precisaTrocarSenha: false,
      },
      usuario2: {
        id: 6,
        username: 'usuario2',
        fullName: 'Usuário Nível II',
        role: 'USUARIO_NIVEL_II',
        areaAcesso: 'ADMINISTRATIVO',
        precisaTrocarSenha: false,
      },
    };

    return users[username] ?? null;
  }
}