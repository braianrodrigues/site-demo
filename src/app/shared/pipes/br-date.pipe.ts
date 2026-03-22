import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'brDate',
  standalone: true
})
export class BrDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return '';
    }

    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const ano = date.getFullYear();

    return `${dia}-${mes}-${ano}`;
  }
}