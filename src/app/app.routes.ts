import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard.component';

export const routes: Routes = [
  // DASHBOARD
  {
    path: '',
    component: DashboardComponent,
    title: 'Painel',
  },

  // PERFIL
  {
    path: 'perfil',
    title: 'Perfil do Usuário',
    loadComponent: () =>
      import('./features/perfil/perfil-page.component').then(
        (m) => m.PerfilPageComponent
      ),
  },

  // OPERAÇÕES
  {
    path: 'operacoes',
    title: 'Operações',
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'cadastro-telefonico',
      },
      {
        path: 'cadastro-telefonico',
        loadComponent: () =>
          import('./features/operacoes/cadastro-telefonico-list.component').then(
            (m) => m.CadastroTelefonicoListComponent
          ),
        title: 'Cadastro Telefônico',
      },
      {
        path: 'cadastro-telefonico/novo',
        loadComponent: () =>
          import('./features/operacoes/cadastro-telefonico-create.component').then(
            (m) => m.CadastroTelefonicoCreateComponent
          ),
        title: 'Cadastro Telefônico — Novo',
      },
      {
        path: 'cadastro-telefonico/:id/editar',
        loadComponent: () =>
          import('./features/operacoes/cadastro-telefonico-create.component').then(
            (m) => m.CadastroTelefonicoCreateComponent
          ),
        title: 'Cadastro Telefônico — Editar',
      },
      {
        path: 'cadastro-telefonico/:id/visualizar',
        loadComponent: () =>
          import('./features/operacoes/cadastro-telefonico-create.component').then(
            (m) => m.CadastroTelefonicoCreateComponent
          ),
        title: 'Cadastro Telefônico — Visualizar',
        data: {
          readonly: true,
        },
      },
      {
        path: 'gerenciar',
        loadComponent: () =>
          import('./features/operacoes/gerenciar-operacoes-page.component').then(
            (m) => m.GerenciarOperacoesPageComponent
          ),
        title: 'Gerenciar Operações',
      },
    ],
  },

  // ALVOS
  {
    path: 'alvos',
    title: 'Alvos',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/alvos/alvos-list.component').then(
            (m) => m.AlvosListComponent
          ),
        title: 'Alvos — Lista',
      },
      {
        path: 'novo',
        loadComponent: () =>
          import('./features/alvos/alvos-create.component').then(
            (m) => m.AlvosCreateComponent
          ),
        title: 'Alvos — Novo',
      },
      {
        path: ':id/editar',
        loadComponent: () =>
          import('./features/alvos/alvos-create.component').then(
            (m) => m.AlvosCreateComponent
          ),
        title: 'Alvos — Editar',
      },
      {
        path: ':id/visualizar',
        loadComponent: () =>
          import('./features/alvos/alvos-create.component').then(
            (m) => m.AlvosCreateComponent
          ),
        title: 'Alvos — Visualizar',
        data: {
          readonly: true,
        },
      },
    ],
  },

  // PRODUTIVIDADE
  {
    path: 'produtividade',
    title: 'Produtividade',
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'lista' },

      {
        path: 'lista',
        loadComponent: () =>
          import('./features/produtividade/produtividade-list.component').then(
            (m) => m.ProdutividadeListComponent
          ),
        title: 'Produtividade — Lista',
      },

      {
        path: 'novo',
        loadComponent: () =>
          import('./features/produtividade/produtividade-create.component').then(
            (m) => m.ProdutividadeCreateComponent
          ),
        title: 'Produtividade — Novo',
      },

      {
        path: ':id/editar',
        loadComponent: () =>
          import('./features/produtividade/produtividade-create.component').then(
            (m) => m.ProdutividadeCreateComponent
          ),
        title: 'Produtividade — Editar',
      },

      {
        path: ':id/visualizar',
        loadComponent: () =>
          import('./features/produtividade/produtividade-create.component').then(
            (m) => m.ProdutividadeCreateComponent
          ),
        title: 'Produtividade — Visualizar',
        data: {
          readonly: true,
        },
      },
    ],
  },

  // USUÁRIOS
  {
    path: 'usuarios',
    title: 'Usuários',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/users/users-create.component').then(
            (m) => m.UsersCreateComponent
          ),
        title: 'Usuários — Novo',
      },
      {
        path: 'novo',
        loadComponent: () =>
          import('./features/users/users-create.component').then(
            (m) => m.UsersCreateComponent
          ),
        title: 'Usuários — Novo',
      },
      {
        path: 'lista',
        loadComponent: () =>
          import('./features/users/users-list.component').then(
            (m) => m.UsersListComponent
          ),
        title: 'Usuários — Lista',
      },
      {
        path: ':id/editar',
        loadComponent: () =>
          import('./features/users/users-create.component').then(
            (m) => m.UsersCreateComponent
          ),
        title: 'Usuários — Editar',
      },
    ],
  },

  // RELATÓRIOS
  {
    path: 'relatorios',
    loadComponent: () =>
      import('./features/stubs/relatorios.stub').then(
        (m) => m.RelatoriosStubComponent
      ),
    title: 'Relatórios',
  },

  // LOGS
  {
    path: 'logs',
    loadComponent: () =>
      import('./features/stubs/logs.page').then((m) => m.LogsStubComponent),
    title: 'Logs',
  },

  // PRIMEIRO ACESSO
  {
    path: 'primeiro-acesso',
    loadComponent: () =>
      import('./features/primeiro-acesso/primeiro-acesso.component').then(
        (m) => m.PrimeiroAcessoComponent
      ),
    title: 'Primeiro acesso',
  },

  // LOGIN
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
    title: 'Login',
  },

  // 404
  { path: '**', redirectTo: '' },
];