import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  OperacaoResponse,
  OperacoesService,
  ProrrogacaoResponse,
} from './operacoes.service';

export interface CadastroTelefonicoRequest {
  cadastradoPor: string | null;
  dataCadastro: string | null;
  numeroTelefone: string | null;
  operadora: string | null;
  situacao: string | null;
  plano: string | null;
  possuiRegistrosAnteriores: string | null;

  operacaoNome: string | null;
  prorrogacaoDescricao: string | null;

  nome: string | null;
  rg: string | null;
  cpf: string | null;
  endereco: string | null;
  cidade: string | null;
  dataAtivacao: string | null;
  dataConsulta: string | null;
  observacoes: string | null;
}

export interface CadastroTelefonicoResponse {
  id: number;
  cadastradoPor: string | null;
  dataCadastro: string | null;
  numeroTelefone: string | null;
  operadora: string | null;
  situacao: string | null;
  plano: string | null;
  possuiRegistrosAnteriores: string | null;

  operacaoNome: string | null;
  prorrogacaoDescricao: string | null;

  nome: string | null;
  rg: string | null;
  cpf: string | null;
  endereco: string | null;
  cidade: string | null;
  dataAtivacao: string | null;
  dataConsulta: string | null;
  observacoes: string | null;

  createdAt?: string;
  updatedAt?: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root',
})
export class CadastroTelefonicoService {
  private readonly http = inject(HttpClient);
  private readonly operacoesService = inject(OperacoesService);
  private readonly baseUrl = `${environment.API_URL}/api/cadastros-telefonicos`;

  readonly operadoraOptions = [
    'VIVO',
    'TIM',
    'CLARO',
    'OI',
    'NEXTEL',
    'CORREIOS',
    'OUTRA',
  ];

  readonly situacaoOptions = [
    'INTERLOCUTOR',
    'INTERCEPTADO',
    'PESQUISA JUDICIAL',
    'PESQUISA'
  ];

  readonly planoOptions = [
    'PRÉ-PAGO',
    'PÓS-PAGO',
    'CONTROLE',
    'CORPORATIVO',
    'DESCONHECIDO',
  ];

  readonly possuiRegistrosOptions = [
    'SIM',
    'NÃO',
  ];

  list(page = 0, size = 20, q = ''): Observable<PageResponse<CadastroTelefonicoResponse>> {
    return this.http.get<PageResponse<CadastroTelefonicoResponse>>(
      `${this.baseUrl}?page=${page}&size=${size}&q=${encodeURIComponent(q)}`
    );
  }

  getById(id: number): Observable<CadastroTelefonicoResponse> {
    return this.http.get<CadastroTelefonicoResponse>(`${this.baseUrl}/${id}`);
  }

  create(payload: CadastroTelefonicoRequest): Observable<CadastroTelefonicoResponse> {
    return this.http.post<CadastroTelefonicoResponse>(this.baseUrl, payload);
  }

  update(id: number, payload: CadastroTelefonicoRequest): Observable<CadastroTelefonicoResponse> {
    return this.http.put<CadastroTelefonicoResponse>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  listOperacoesAtivas(): Observable<OperacaoResponse[]> {
    return this.operacoesService.listOperacoesAtivas();
  }

  listProrrogacoesAtivasByOperacao(operacaoId: number): Observable<ProrrogacaoResponse[]> {
    return this.operacoesService.listProrrogacoesAtivasByOperacao(operacaoId);
  }
}