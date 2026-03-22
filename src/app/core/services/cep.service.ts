import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string; 
  uf: string;        
  erro?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CepService {
  private readonly base = 'https://viacep.com.br/ws';

  constructor(private http: HttpClient) {}

  buscar(cep8: string): Observable<ViaCepResponse> {
    return this.http
      .get<ViaCepResponse>(`${this.base}/${cep8}/json/`)
      .pipe(map((d) => d || ({} as ViaCepResponse)));
  }
}
