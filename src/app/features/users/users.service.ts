// src/app/features/users/users.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

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

export type CreateUserRequest = {
  fullName: string;
  username: string;
  role: UserRole;
  areaAcesso: AreaAcesso;
  enabled?: boolean;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  dataNascimento?: string | null;
};

export type CreateUserResponse = {
  id: number;
  username: string;
  fullName: string;
  role: UserRole | string;
  areaAcesso: AreaAcesso | string;
  enabled?: boolean;
  
};

export type UserDTO = {
  id: number;
  username: string;
  fullName: string;
  role: UserRole | string;
  areaAcesso: AreaAcesso | string;
  enabled?: boolean;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
  dataNascimento?: string | null;
};

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private base = environment.API_URL.replace(/\/+$/, '');

  createUser(dto: CreateUserRequest): Observable<CreateUserResponse> {
    return this.http.post<CreateUserResponse>(
      `${this.base}/api/users`,
      dto
    );
  }

  listUsers(params: { q?: string | null; page?: number; size?: number }):
    Observable<PageResponse<UserDTO>> {

    const httpParams = new HttpParams()
      .set('q', (params.q ?? '').trim())
      .set('page', String(params.page ?? 0))
      .set('size', String(params.size ?? 10));

    return this.http.get<PageResponse<UserDTO>>(
      `${this.base}/api/users`,
      { params: httpParams }
    );
  }

  updateUser(
    id: number,
    dto: {
      fullName: string;
      role: UserRole;
      areaAcesso: AreaAcesso;
      enabled: boolean;
    }
  ): Observable<UserDTO> {
    return this.http.put<UserDTO>(
      `${this.base}/api/users/${id}`,
      dto
    );
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/api/users/${id}`);
  }

  resetPassword(id: number, newPassword: string): Observable<void> {
    return this.http.patch<void>(
      `${this.base}/api/users/${id}/password`,
      newPassword,
      {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      }
    );
  }
}