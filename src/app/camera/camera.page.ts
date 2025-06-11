import { Component } from '@angular/core';

@Component({
  selector: 'app-camera',
  templateUrl: 'camera.page.html',
  styleUrls: ['camera.page.scss'],
  standalone: false
})
export class CameraPage {
  private stream: MediaStream | null = null;
  facingMode: 'user' | 'environment' = 'user'; // Inicia com a câmera frontal (selfie)
  videoQuality: 'low' | 'medium' | 'high' = 'medium'; // Qualidade padrão: 720p
  isBlackAndWhite: boolean = false; // Estado do filtro preto e branco
  isARMode: boolean = false; // Controla o modo AR
  isGalleryOpen: boolean = false; // Controla a abertura do offcanvas da galeria
  photos: string[] = []; // Armazena as URLs das fotos em memória

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
      console.log('Câmera iniciada com sucesso');
    } catch (error) {
      if (this.videoQuality !== 'low') {
        console.log('Tentando qualidade baixa como fallback');
        this.videoQuality = 'low';
        await this.startCamera();
      } else {
        console.error('Falha ao iniciar a câmera mesmo com qualidade baixa');
      }
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      const video = document.getElementById('video') as HTMLVideoElement;
      video.srcObject = null;
      console.log('Câmera parada com sucesso');
    }
  }

  async toggleCamera() {
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    if (this.stream) {
      await this.startCamera();
    }
  }

  async changeQuality() {
    if (this.stream) {
      await this.startCamera();
    }
  }

  toggleBlackAndWhite() {
    this.isBlackAndWhite = !this.isBlackAndWhite;
  }

  takePhoto() {
    const video = document.getElementById('video') as HTMLVideoElement;
    if (!video.srcObject) {
      console.error('Câmera não está ativa');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Espelhar a imagem no canvas para corrigir o efeito de espelhamento do vídeo
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // Aplicar filtro preto e branco se ativo
      if (this.isBlackAndWhite) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = avg; // R
          data[i + 1] = avg; // G
          data[i + 2] = avg; // B
        }
        ctx.putImageData(imageData, 0, 0);
      }
      const photoUrl = canvas.toDataURL('image/png');
      this.photos.push(photoUrl);
      console.log('Foto capturada e adicionada à galeria');
    }
  }

  openGallery() {
    this.isGalleryOpen = true;
  }

  closeGallery() {
    this.isGalleryOpen = false;
  }

  savePhoto(index: number) {
    const photoUrl = this.photos[index];
    const link = document.createElement('a');
    link.href = photoUrl;
    link.download = `photo_${new Date().toISOString()}.png`;
    link.click();
    console.log('Foto salva');
  }

  async copyPhoto(index: number) {
    const photoUrl = this.photos[index];
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      console.log('Foto copiada para a área de transferência');
    } catch (error) {
      console.error('Erro ao copiar a foto:', error);
    }
  }

  Iniciarar() {
    // Função AR não modificada
  }
}
