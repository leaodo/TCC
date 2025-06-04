import { Component } from '@angular/core';
import { Camera, CameraResultType } from '@capacitor/camera';

@Component({
  selector: 'app-camera',
  templateUrl: 'camera.page.html',
  styleUrls: ['camera.page.scss'],
  standalone:false
})
export class CameraPage {
  private stream: MediaStream | null = null;
  facingMode: 'user' | 'environment' = 'user'; // Inicia com a câmera frontal (selfie)
  videoQuality: 'low' | 'medium' | 'high' = 'medium'; // Qualidade padrão: 720p
  isBlackAndWhite: boolean = false; // Estado do filtro preto e branco

  private qualitySettings = {
    low: { width: 640, height: 480, frameRate: 30 },
    medium: { width: 1280, height: 720, frameRate: 30 },
    high: { width: 1920, height: 1080, frameRate: 30 }
  };

  async startCamera() {
    await this.stopCamera(); // Para qualquer stream existente antes de iniciar um novo
    try {
      const constraints = {
        video: {
          facingMode: this.facingMode,
          width: { ideal: this.qualitySettings[this.videoQuality].width },
          height: { ideal: this.qualitySettings[this.videoQuality].height },
          frameRate: { ideal: this.qualitySettings[this.videoQuality].frameRate }
        },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      const video = document.getElementById('video') as HTMLVideoElement;
      video.srcObject = this.stream;
    } catch (error) {
      console.error('Erro ao acessar a câmera:', error);
      // Fallback para resolução menor se a qualidade selecionada não for suportada
      if (this.videoQuality !== 'low') {
        this.videoQuality = 'low';
        await this.startCamera();
      }
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      const video = document.getElementById('video') as HTMLVideoElement;
      video.srcObject = null;
    }
  }

  async toggleCamera() {
    // Alterna entre câmera frontal ('user') e traseira ('environment')
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    if (this.stream) {
      await this.startCamera(); // Reinicia a câmera com o novo facingMode
    }
  }

  async changeQuality() {
    if (this.stream) {
      await this.startCamera(); // Reinicia a câmera com a nova qualidade
    }
  }

  toggleBlackAndWhite() {
    this.isBlackAndWhite = !this.isBlackAndWhite; // Alterna o estado do filtro
  }
}
