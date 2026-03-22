import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface OperacaoResponse {
  id: number;
  nome: string;
  ativo: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OperacaoRequest {
  nome: string;
  ativo?: boolean;
}

export interface ProrrogacaoResponse {
  id: number;
  nome: string;
  dataInicio: string;
  dataFim: string;
  ativo: boolean;
  operacaoId: number;
  operacaoNome: string;
  descricaoExibicao: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProrrogacaoRequest {
  nome: string;
  dataInicio: string;
  dataFim: string;
  ativo?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class OperacoesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.API_URL}/api`;

  listOperacoes(q = '', page = 0, size = 50): Observable<PageResponse<OperacaoResponse>> {
    return this.http.get<PageResponse<OperacaoResponse>>(
      `${this.baseUrl}/operacoes?q=${encodeURIComponent(q)}&page=${page}&size=${size}`
    );
  }

  listOperacoesAtivas(): Observable<OperacaoResponse[]> {
    return this.http.get<OperacaoResponse[]>(`${this.baseUrl}/operacoes/ativas`);
  }

  getOperacao(id: number): Observable<OperacaoResponse> {
    return this.http.get<OperacaoResponse>(`${this.baseUrl}/operacoes/${id}`);
  }

  createOperacao(payload: OperacaoRequest): Observable<OperacaoResponse> {
    return this.http.post<OperacaoResponse>(`${this.baseUrl}/operacoes`, payload);
  }

  updateOperacao(id: number, payload: OperacaoRequest): Observable<OperacaoResponse> {
    return this.http.put<OperacaoResponse>(`${this.baseUrl}/operacoes/${id}`, payload);
  }

  deleteOperacao(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/operacoes/${id}`);
  }

  listProrrogacoesByOperacao(
    operacaoId: number,
    q = '',
    page = 0,
    size = 50
  ): Observable<PageResponse<ProrrogacaoResponse>> {
    return this.http.get<PageResponse<ProrrogacaoResponse>>(
      `${this.baseUrl}/operacoes/${operacaoId}/prorrogacoes?q=${encodeURIComponent(q)}&page=${page}&size=${size}`
    );
  }

  listProrrogacoesAtivasByOperacao(operacaoId: number): Observable<ProrrogacaoResponse[]> {
    return this.http.get<ProrrogacaoResponse[]>(
      `${this.baseUrl}/operacoes/${operacaoId}/prorrogacoes/ativas`
    );
  }

  getProrrogacao(id: number): Observable<ProrrogacaoResponse> {
    return this.http.get<ProrrogacaoResponse>(`${this.baseUrl}/prorrogacoes/${id}`);
  }

  createProrrogacao(
    operacaoId: number,
    payload: ProrrogacaoRequest
  ): Observable<ProrrogacaoResponse> {
    return this.http.post<ProrrogacaoResponse>(
      `${this.baseUrl}/operacoes/${operacaoId}/prorrogacoes`,
      payload
    );
  }

  updateProrrogacao(
    id: number,
    payload: ProrrogacaoRequest
  ): Observable<ProrrogacaoResponse> {
    return this.http.put<ProrrogacaoResponse>(
      `${this.baseUrl}/prorrogacoes/${id}`,
      payload
    );
  }

  deleteProrrogacao(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/prorrogacoes/${id}`);
  }
}