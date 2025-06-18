import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-camera',
  templateUrl: 'camera.page.html',
  styleUrls: ['camera.page.scss'],
  standalone: false
})
export class CameraPage implements OnInit {
  private stream: MediaStream | null = null;
  facingMode: 'user' | 'environment' = 'user';
  videoQuality: 'low' | 'medium' | 'high' = 'medium';
  isBlackAndWhite: boolean = false;
  isARMode: boolean = false;
  isGalleryOpen: boolean = false;
  isPreviewOpen: boolean = false;
  isSettingsOpen: boolean = false;
  photos: { url: string, timestamp: Date }[] = [];
  selectedPhoto: string | null = null;
  flipHorizontal: boolean = false;
  flipVertical: boolean = false;
  zoomLevel: number = 1;

  private qualitySettings = {
    low: { width: 640, height: 480, frameRate: 30 },
    medium: { width: 1280, height: 720, frameRate: 30 },
    high: { width: 1920, height: 1080, frameRate: 30 }
  };

  constructor(
    private alertController: AlertController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    const savedPhotos = localStorage.getItem('photos');
    if (savedPhotos) {
      const parsedPhotos = JSON.parse(savedPhotos);
      this.photos = parsedPhotos.map((photo: { url: string, timestamp: string }) => ({
        url: photo.url,
        timestamp: new Date(photo.timestamp)
      }));
    }
    const savedSettings = localStorage.getItem('cameraSettings');
    if (savedSettings) {
      const { flipHorizontal, flipVertical, zoomLevel } = JSON.parse(savedSettings);
      this.flipHorizontal = flipHorizontal;
      this.flipVertical = flipVertical;
      this.zoomLevel = zoomLevel;
    }
  }

  private savePhotosToStorage() {
    localStorage.setItem('photos', JSON.stringify(this.photos));
  }

  private saveSettingsToStorage() {
    const settings = {
      flipHorizontal: this.flipHorizontal,
      flipVertical: this.flipVertical,
      zoomLevel: this.zoomLevel
    };
    localStorage.setItem('cameraSettings', JSON.stringify(settings));
  }

  async showToast(message: string, color: string, cssClass: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
      cssClass,
      buttons: [{ text: 'Fechar', role: 'cancel' }]
    });
    await toast.present();
  }

  async startCamera() {
    await this.stopCamera();
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
      this.applyTransformations();
    } catch (error) {
      if (this.videoQuality !== 'low') {
        this.videoQuality = 'low';
        await this.startCamera();
      } else {
        console.error('Falha ao iniciar a câmera');
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
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    if (this.stream) await this.startCamera();
  }

  async changeQuality() {
    if (this.stream) await this.startCamera();
  }

  toggleBlackAndWhite() {
    this.isBlackAndWhite = !this.isBlackAndWhite;
    const video = document.getElementById('video') as HTMLVideoElement;
    video.classList.toggle('black-and-white', this.isBlackAndWhite);
  }

  takePhoto() {
    const video = document.getElementById('video') as HTMLVideoElement;
    if (!video.srcObject) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (this.flipHorizontal) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      if (this.flipVertical) {
        ctx.translate(0, canvas.height);
        ctx.scale(1, -1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      if (this.isBlackAndWhite) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = data[i + 1] = data[i + 2] = avg;
        }
        ctx.putImageData(imageData, 0, 0);
      }
      const photoUrl = canvas.toDataURL('image/png');
      this.photos.push({ url: photoUrl, timestamp: new Date() });
      this.savePhotosToStorage();
      this.showToast('Foto tirada :D', 'warning', 'toast-photo-taken');
    }
  }

  openGallery() { this.isGalleryOpen = true; }
  closeGallery() { this.isGalleryOpen = false; }

  savePhoto(index: number) {
    const photo = this.photos[index];
    const link = document.createElement('a');
    link.href = photo.url;
    link.download = `photo_${photo.timestamp.toISOString()}.png`;
    link.click();
    this.showToast('Imagem salva :)', 'success', 'toast-photo-saved');
  }

  async copyPhoto(index: number) {
    const photo = this.photos[index];
    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      this.showToast('Imagem copiada :)', 'success', 'toast-photo-copied');
    } catch (error) {
      this.showToast('Erro ao copiar :(', 'danger', 'toast-error');
    }
  }

  async deletePhoto(index: number) {
    const alert = await this.alertController.create({
      header: 'Confirmar Exclusão',
      message: 'Tem certeza que deseja deletar esta foto?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Deletar',
          handler: () => {
            this.photos.splice(index, 1);
            this.savePhotosToStorage();
            this.showToast('Foto deletada :(', 'danger', 'toast-photo-deleted');
          }
        }
      ]
    });
    await alert.present();
  }

  openPreview(index: number) {
    if (index >= 0 && index < this.photos.length) {
      this.selectedPhoto = this.photos[index].url;
      this.isPreviewOpen = true;
    }
  }

  closePreview() {
    this.isPreviewOpen = false;
    this.selectedPhoto = null;
  }

  openSettings() { this.isSettingsOpen = true; }

  closeSettings() {
    this.saveSettingsToStorage();
    this.isSettingsOpen = false;
  }

  toggleFlipHorizontal() {
    this.flipHorizontal = !this.flipHorizontal;
    this.applyTransformations();
    this.saveSettingsToStorage();
  }

  toggleFlipVertical() {
    this.flipVertical = !this.flipVertical;
    this.applyTransformations();
    this.saveSettingsToStorage();
  }

  onZoomChange(event: any) {
    this.zoomLevel = event.detail.value;
    this.applyTransformations();
    this.saveSettingsToStorage();
  }

  applyTransformations() {
    const video = document.getElementById('video') as HTMLVideoElement;
    if (video) {
      let transform = '';
      if (this.flipHorizontal) transform += 'scaleX(-1) ';
      if (this.flipVertical) transform += 'scaleY(-1) ';
      transform += `scale(${this.zoomLevel})`;
      video.style.transform = transform;
    }
  }

  resetSettings() {
    this.flipHorizontal = false;
    this.flipVertical = false;
    this.zoomLevel = 1;
    this.applyTransformations();
    this.saveSettingsToStorage();
  }

  onRangeDragStart() {
    const modal = document.querySelector('ion-modal#settings-modal') as HTMLIonModalElement;
    if (modal) modal.classList.add('transparent');
  }

  onRangeDragEnd() {
    const modal = document.querySelector('ion-modal#settings-modal') as HTMLIonModalElement;
    if (modal) modal.classList.remove('transparent');
  }

  Iniciarar() { /* Função AR não modificada */ }

  formatTimestamp(timestamp: Date): string {
    const day = String(timestamp.getDate()).padStart(2, '0');
    const month = String(timestamp.getMonth() + 1).padStart(2, '0');
    const year = timestamp.getFullYear();
    const hours = String(timestamp.getHours()).padStart(2, '0');
    const minutes = String(timestamp.getMinutes()).padStart(2, '0');
    const seconds = String(timestamp.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }
}
