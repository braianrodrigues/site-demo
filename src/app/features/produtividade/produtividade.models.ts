// src/app/features/produtividade/produtividade.models.ts

export type ProdutividadeNatureza =
  | 'PORTE_DE_ARMA'
  | 'RECEPTACAO'
  | 'HOMICIDIO'
  | 'AMEACA'
  | 'LESAO_CORPORAL'
  | 'ESTUPRO'
  | 'PRISAO_CIVIL'
  | 'OPERACAO_POLICIAL'
  | 'MDIP'
  | 'OUTROS'
 
  | (string & {});

export interface ProdutividadeQualificacaoDTO {
  id?: number;
  nome?: string | null;
  rg?: string | null;
  cpf?: string | null;
  endereco?: string | null;
  artigo?: string | null;
  sindicado?: string | null;
  faccao?: string | null;
  banco?: string | null;
}

export interface ProdutividadeArmaDTO {
  id?: number;
  tipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  qtdeMunicoes?: number | null;
}

export interface ProdutividadeCelularDTO {
  id?: number;
  marca?: string | null;
  modelo?: string | null;
}

export interface ProdutividadeDrogasDTO {
  maconha?: string | null;
  cocaina?: string | null;
  crack?: string | null;
  haxixe?: string | null;
  skank?: string | null;
  lancaPerfume?: string | null;
  lsd?: string | null;
  ecstasy?: string | null;
  cigarro?: string | null;
  outrasDrogas?: string | null;
  explosivos?: string | null;
  peDeMaconha?: string | null;
}

export interface ProdutividadeVeiculosDTO {
  carro?: string | null;
  moto?: string | null;
  caminhao?: string | null;
  camionete?: string | null;
}

export interface ProdutividadeCreateRequest {
  cadastradoPorUserId: number | null;

  data: string; 
  natureza: string;
  equipe: string;
  execucao: string | null;
  acoes: string | null;

  bopm: string | null;
  bopc: string | null;

  operacaoId: number | null;

  qualificacoes: ProdutividadeQualificacaoDTO[];
  armas: ProdutividadeArmaDTO[];
  celulares: ProdutividadeCelularDTO[];

  drogas: ProdutividadeDrogasDTO;
  veiculos: ProdutividadeVeiculosDTO;

  valores: string | null;
  outros: string | null;

  sintese: string | null;
}

export interface ProdutividadeResponseDTO {
  id: number;

  cadastradoPorUserId: number | null;
  cadastradoPorNome: string | null;
  cadastradoPorUsername: string | null;
  cadastradoPorRole: string | null;

  data: string; 

  natureza: string;
  equipe: string;
  execucao: string | null;
  acoes: string | null;

  bopm: string | null;
  bopc: string | null;

  operacaoId: number | null;

  qualificacoes: ProdutividadeQualificacaoDTO[];
  armas: ProdutividadeArmaDTO[];
  celulares: ProdutividadeCelularDTO[];

  drogas: ProdutividadeDrogasDTO;
  veiculos: ProdutividadeVeiculosDTO;

  valores: string | null;
  outros: string | null;

  sintese: string | null;
}