// src/app/features/produtividade/produtividade-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ProdutividadeCreateRequest,
  ProdutividadeResponseDTO,
} from './produtividade.models';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export type ProdutividadeListDTO = {
  id: number;
  data: string; 
  natureza: string;
  equipe: string;
  execucao?: string | null;
  primeiroEnvolvidoNome?: string | null;
  cadastradoPorNome?: string | null;
  bopm?: string | null;
  bopc?: string | null;
};

@Injectable({ providedIn: 'root' })
export class ProdutividadeApiService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.API_URL}/api/produtividades`;

  list(q: string, page: number, size: number): Observable<PageResponse<ProdutividadeListDTO>> {
    let params = new HttpParams()
      .set('q', q ?? '')
      .set('page', String(page ?? 0))
      .set('size', String(size ?? 10));

    return this.http.get<PageResponse<ProdutividadeListDTO>>(this.baseUrl, { params });
  }

  getById(id: number): Observable<ProdutividadeResponseDTO> {
    return this.http.get<ProdutividadeResponseDTO>(`${this.baseUrl}/${id}`);
  }

  create(payload: ProdutividadeCreateRequest): Observable<ProdutividadeResponseDTO> {
    return this.http.post<ProdutividadeResponseDTO>(this.baseUrl, payload);
  }

  update(id: number, payload: ProdutividadeCreateRequest): Observable<ProdutividadeResponseDTO> {
    return this.http.put<ProdutividadeResponseDTO>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}