import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TesteARPage } from './teste-ar.page';

const routes: Routes = [
  {
    path: '',
    component: TesteARPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TesteARPageRoutingModule {}
