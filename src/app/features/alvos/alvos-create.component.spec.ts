import { TestBed } from '@angular/core/testing';
import { AlvosCreateComponent } from './alvos-create.component';

describe('AlvosCreateComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlvosCreateComponent],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AlvosCreateComponent);
    const comp = fixture.componentInstance;
    expect(comp).toBeTruthy();
  });
});
