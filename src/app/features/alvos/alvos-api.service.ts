// src/app/features/alvos/alvos-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpEvent } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export type AlvoListDTO = {
  id: number;
  nome: string;
  vulgo: string | null;
  cpf: string;
  cidade: string | null;
  estado: string | null;
  fotoUrl?: string | null;
};

export type FotoInfoDTO = {
  id: number;
  filename: string;
  contentType: string;
  size: number;
};

export type RedeSocialDTO = {
  id?: number | null;
  plataforma: string | null;
  username: string | null;
  url: string | null;
  observacao: string | null;
};

export type FamiliaDTO = {
  id?: number | null;
  parentesco: string | null;
  nome: string | null;
  cpf: string | null;
  telefone: string | null;
  observacao: string | null;
  alvoRelacionadoId?: number | null;
  alvoRelacionadoNome?: string | null;
};

export type CorrelacaoDTO = {
  id: number;
  tipo: string;
  chave: string;
  detalhe: string | null;
  score: number;
  outroAlvoId: number;
  outroAlvoNome: string;
  outroAlvoVulgo: string | null;
};

export type EnderecoDTO = {
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  estado: string | null;
  cidade: string | null;
};

export type TelefoneDTO = { numero: string | null; tipo: string | null };

export type VeiculoDTO = {
  placa: string | null;
  marcaModelo: string | null;
  cor: string | null;
  ano: string | null;
};

export type ComparsaDTO = {
  nome: string | null;
  cpf: string | null;
  alvoRelacionadoId?: number | null;
  alvoRelacionadoNome?: string | null;
  alvoRelacionadoVulgo?: string | null;
};

export type AlvoResponseDTO = {
  id: number;

  nome: string;
  vulgo: string | null;
  matricula: string | null;
  dataNascimento: string | null;
  cpf: string;
  rg: string | null;
  situacao: string | null;

  nomePai: string | null;
  nomeMae: string | null;

  operacao: string;
  tipoAlvo: string;
  faccao: string | null;
  resumo: string | null;

  enderecos?: EnderecoDTO[];
  telefones: TelefoneDTO[];
  veiculos: VeiculoDTO[];
  comparsas: ComparsaDTO[];
  fotos: FotoInfoDTO[];

  redesSociais?: RedeSocialDTO[];
  familiares?: FamiliaDTO[];
};

export type AlvoUpsertDTO = Omit<AlvoResponseDTO, 'id' | 'fotos'> & { fotos?: never };

export type PageResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type AlvoExistsDTO = {
  exists: boolean;
  id?: number | null;
  nome?: string | null;
  vulgo?: string | null;
};

@Injectable({ providedIn: 'root' })
export class AlvosApiService {
  private http = inject(HttpClient);

  private base = environment.API_URL.replace(/\/+$/, '');
  private resource = `${this.base}/api/alvos`;

  list(q: string, page: number, size: number) {
    let params = new HttpParams().set('page', page).set('size', size);
    if (q) params = params.set('q', q);
    return this.http.get<PageResponse<AlvoListDTO>>(this.resource, { params });
  }

  get(id: number) {
    return this.http.get<AlvoResponseDTO>(`${this.resource}/${id}`);
  }

  create(body: AlvoUpsertDTO | FormData) {
    return this.http.post<AlvoResponseDTO>(this.resource, body);
  }

  update(id: number, body: AlvoUpsertDTO | FormData) {
    return this.http.put<AlvoResponseDTO>(`${this.resource}/${id}`, body);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.resource}/${id}`);
  }

  checkCpf(cpfDigits: string, id?: number) {
    let params = new HttpParams().set('cpf', cpfDigits);
    if (id) params = params.set('id', id);
    return this.http.get<{ exists: boolean }>(`${this.resource}/check-cpf`, { params });
  }

  existsByCpf(cpfDigits: string) {
    const params = new HttpParams().set('cpf', cpfDigits);
    return this.http.get<AlvoExistsDTO>(`${this.resource}/exists`, { params });
  }

  fotoUrl(alvoId: number, fotoId: number, bust?: string | number) {
    const v = bust ?? Date.now();
    return `${this.resource}/${alvoId}/fotos/${fotoId}?v=${v}`;
  }

  getFotoBlob(alvoId: number, fotoId: number) {
    return this.http.get(`${this.resource}/${alvoId}/fotos/${fotoId}`, { responseType: 'blob' });
  }

  deleteFoto(alvoId: number, fotoId: number) {
    return this.http.delete<void>(`${this.resource}/${alvoId}/fotos/${fotoId}`);
  }

  uploadFotos(alvoId: number, files: File[]) {
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    return this.http.post<FotoInfoDTO[]>(`${this.resource}/${alvoId}/fotos`, fd);
  }

  uploadFotosWithProgress(alvoId: number, files: File[]): Observable<HttpEvent<any>> {
    const fd = new FormData();
    for (const f of files) fd.append('files', f);

    return this.http.post(`${this.resource}/${alvoId}/fotos`, fd, {
      observe: 'events',
      reportProgress: true,
    }) as Observable<HttpEvent<any>>;
  }

  getCorrelacoes(alvoId: number) {
    return this.http.get<CorrelacaoDTO[]>(`${this.resource}/${alvoId}/correlacoes`);
  }

  rebuildCorrelacoes(alvoId: number) {
    return this.http.post<void>(`${this.resource}/${alvoId}/correlacoes/rebuild`, {});
  }
}
