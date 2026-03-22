import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ProfileResponse {
  id: number;
  fullName: string;
  username: string;
  role: string;
  areaAcesso: string;
  enabled: boolean;
  precisaTrocarSenha: boolean;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  dataNascimento: string | null;
  re: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateMyProfileRequest {
  fullName: string;
  telefone: string | null;
  endereco: string | null;
  dataNascimento: string | null;
  re: string | null;
}

export interface ChangeMyPasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.API_URL}/api/profile`;

  getMyProfile(): Observable<ProfileResponse> {
    return this.http.get<ProfileResponse>(`${this.apiUrl}/me`);
  }

  updateMyProfile(payload: UpdateMyProfileRequest): Observable<ProfileResponse> {
    return this.http.put<ProfileResponse>(`${this.apiUrl}/me`, payload);
  }

  changeMyPassword(payload: ChangeMyPasswordRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/me/password`, payload);
  }
}