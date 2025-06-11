import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TesteARPage } from './teste-ar.page';

describe('TesteARPage', () => {
  let component: TesteARPage;
  let fixture: ComponentFixture<TesteARPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TesteARPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
