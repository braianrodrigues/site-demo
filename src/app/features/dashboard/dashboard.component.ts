import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgFor, MatCardModule, MatButtonModule, MatChipsModule, MatIconModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {
  kpis = [
    { title: 'Ocorrências Hoje', value: 0, chip: 'Operacional' },
    { title: 'Viaturas Ativas', value: 0, chip: 'Frota' },
    { title: 'Efetivo em Serviço', value: 0, chip: 'Pessoal' },
    { title: 'Alertas', value: 0, chip: 'Crítico' },
  ];

  refresh() {
    // TODO: futuramente buscar dados no backend
  }
}
