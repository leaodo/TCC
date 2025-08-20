import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router'; // Para navegação

@Component({
  selector: 'app-teste-ar',
  templateUrl: './teste-ar.page.html',
  styleUrls: ['./teste-ar.page.scss'],
  standalone: false
})
export class TesteARPage implements OnInit, OnDestroy {
  private stream: MediaStream | null = null;

  constructor(private router: Router) { }

  async ngOnInit() {
    await this.startARCamera();
  }

  ngOnDestroy() {
    this.stopARCamera();
  }

  private async startARCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); // Câmera traseira para AR
      // AR.js gerencia o feed automaticamente, mas isso garante permissão
    } catch (error) {
      console.error('Erro ao iniciar câmera AR:', error);
    }
  }

  private stopARCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
  }

  voltarParaCamera() {
    this.router.navigate(['/camera']);
  }
}
