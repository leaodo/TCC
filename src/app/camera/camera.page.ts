import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-camera',
  templateUrl: 'camera.page.html',
  styleUrls: ['camera.page.scss'],
  standalone: false
})
export class CameraPage implements OnInit {
  public stream: MediaStream | null = null;
  facingMode: 'user' | 'environment' = 'user';
  videoQuality: 'low' | 'medium' | 'high' = 'medium';
  isBlackAndWhite: boolean = false;
  isARMode: boolean = false;
  isGalleryOpen: boolean = false;
  isPreviewOpen: boolean = false;
  isSettingsOpen: boolean = false;
  photos: { url: string, timestamp: Date, size: number }[] = [];
  videos: { url: string, thumbnail: string, timestamp: Date, size: number }[] = [];
  selectedPhoto: string | null = null;
  selectedVideoUrl: string | null = null;
  isVideoPreviewOpen: boolean = false;
  flipHorizontal: boolean = false;
  flipVertical: boolean = false;
  zoomLevel: number = 1;
  videoDevices: MediaDeviceInfo[] = [];
  selectedDeviceId: string = '';
  isRecording: boolean = false;
  isPaused: boolean = false;
  mediaRecorder: MediaRecorder | null = null;
  recordedChunks: Blob[] = [];
  recordingTimer: any;
  maxRecordingTime: number = 30; // em segundos
  recordingStartTime: number = 0;
  elapsedTime: number = 0;
  timerInterval: any;
  photoFormat: 'png' | 'jpeg' = 'png';
  videoFormat: 'mp4' | 'webm' = 'mp4';

  private qualitySettings = {
    low: { width: 640, height: 480, frameRate: 30 },
    medium: { width: 1280, height: 720, frameRate: 30 },
    high: { width: 1920, height: 1080, frameRate: 30 }
  };

  constructor(
    private alertController: AlertController,
    private toastController: ToastController,
    private router: Router
  ) { }

  async ngOnInit() {
    const savedPhotos = localStorage.getItem('photos');
    if (savedPhotos) {
      const parsedPhotos = JSON.parse(savedPhotos);
      this.photos = parsedPhotos.map((photo: { url: string, timestamp: string, size?: number }) => ({
        url: photo.url,
        timestamp: new Date(photo.timestamp),
        size: photo.size || 0
      }));
    }
    const savedVideos = localStorage.getItem('videos');
    if (savedVideos) {
      const parsedVideos = JSON.parse(savedVideos);
      this.videos = parsedVideos.map((video: { url: string, thumbnail: string, timestamp: string, size?: number }) => ({
        url: video.url,
        thumbnail: video.thumbnail,
        timestamp: new Date(video.timestamp),
        size: video.size || 0
      }));
    }
    const savedSettings = localStorage.getItem('cameraSettings');
    if (savedSettings) {
      const { flipHorizontal, flipVertical, zoomLevel, selectedDeviceId, photoFormat, videoFormat } = JSON.parse(savedSettings);
      this.flipHorizontal = flipHorizontal;
      this.flipVertical = flipVertical;
      this.zoomLevel = zoomLevel;
      this.selectedDeviceId = selectedDeviceId || '';
      this.photoFormat = photoFormat || 'png';
      this.videoFormat = videoFormat || 'mp4';
    }
    window.addEventListener('resize', this.adjustCanvasSize.bind(this));
    await this.loadVideoDevices();
  }

  private async loadVideoDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.videoDevices = devices.filter(device => device.kind === 'videoinput');
      if (this.videoDevices.length === 0) {
        console.warn('No video devices found');
      }
    } catch (error) {
      console.error('Error enumerating devices:', error);
      this.showToast('Erro ao listar dispositivos de câmera', 'danger', 'toast-error');
    }
  }

  private savePhotosToStorage() {
    localStorage.setItem('photos', JSON.stringify(this.photos));
  }

  private saveVideosToStorage() {
    localStorage.setItem('videos', JSON.stringify(this.videos));
  }

  private saveSettingsToStorage() {
    const settings = {
      flipHorizontal: this.flipHorizontal,
      flipVertical: this.flipVertical,
      zoomLevel: this.zoomLevel,
      selectedDeviceId: this.selectedDeviceId,
      photoFormat: this.photoFormat,
      videoFormat: this.videoFormat
    };
    localStorage.setItem('cameraSettings', JSON.stringify(settings));
  }

  async showToast(message: string, color: string, cssClass: string, clickable: boolean = false) {
    const toast = await this.toastController.create({
      message,
      duration: 2600,
      color,
      position: 'bottom',
      cssClass,
      buttons: [{ text: 'Fechar', role: 'cancel' }]
    });
    if (clickable) {
      toast.onclick = () => {
        this.openGallery();
        toast.dismiss();
      };
    }
    await toast.present();
  }

  adjustCanvasSize() {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
  }

  async startCamera() {
    await this.stopCamera();
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: this.facingMode,
          width: { ideal: this.qualitySettings[this.videoQuality].width },
          height: { ideal: this.qualitySettings[this.videoQuality].height },
          frameRate: { ideal: this.qualitySettings[this.videoQuality].frameRate },
          deviceId: this.selectedDeviceId ? { exact: this.selectedDeviceId } : undefined
        },
        audio: false
      };
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      const video = document.getElementById('video') as HTMLVideoElement;
      const canvas = document.getElementById('canvas') as HTMLCanvasElement;
      if (!canvas) {
        console.error('Canvas element not found');
        return;
      }
      video.srcObject = this.stream;
      this.adjustCanvasSize();
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const render = () => {
          const zoom = this.zoomLevel;
          const srcWidth = video.videoWidth / zoom;
          const srcHeight = video.videoHeight / zoom;
          const srcX = (video.videoWidth - srcWidth) / 2;
          const srcY = (video.videoHeight - srcHeight) / 2;
          ctx.save();
          if (this.flipHorizontal) {
            ctx.scale(-1, 1);
            ctx.translate(-canvas.width, 0);
          }
          if (this.flipVertical) {
            ctx.scale(1, -1);
            ctx.translate(0, -canvas.height);
          }
          ctx.drawImage(video, srcX, srcY, srcWidth, srcHeight, 0, 0, canvas.width, canvas.height);
          ctx.restore();
          requestAnimationFrame(render);
        };
        video.onloadedmetadata = () => {
          console.log('Video metadata loaded:', video.videoWidth, video.videoHeight);
          render();
        };
        video.onerror = (err) => {
          console.error('Video error:', err);
          this.stopCamera();
        };
      } else {
        console.error('Failed to get canvas context');
        this.stopCamera();
      }
    } catch (error) {
      console.error('Failed to start camera:', error);
      this.stopCamera();
      if (this.videoQuality !== 'low') {
        this.videoQuality = 'low';
        await this.startCamera();
      } else {
        this.showToast('Falha ao iniciar a câmera', 'danger', 'toast-error');
      }
    }
  }

  async onDeviceChange() {
    this.saveSettingsToStorage();
    if (this.stream) {
      await this.startCamera();
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      const video = document.getElementById('video') as HTMLVideoElement;
      const canvas = document.getElementById('canvas') as HTMLCanvasElement;
      video.srcObject = null;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
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
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    canvas.classList.toggle('black-and-white', this.isBlackAndWhite);
  }

  async takePhoto() {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (!this.stream || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (this.isBlackAndWhite) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = data[i + 1] = data[i + 2] = avg;
        }
        ctx.putImageData(imageData, 0, 0);
      }
      const mimeType = this.photoFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
      const quality = this.photoFormat === 'jpeg' ? 0.8 : 1.0; // JPEG quality
      const photoUrl = canvas.toDataURL(mimeType, quality);
      const blob = await (await fetch(photoUrl)).blob();
      const size = blob.size;
      this.photos.push({ url: photoUrl, timestamp: new Date(), size });
      this.savePhotosToStorage();
      this.showToast('Foto tirada :D', 'warning', 'toast-photo-taken');
    }
  }

  private getSupportedMimeType(): string {
    const mimeTypes = [
      `video/${this.videoFormat};codecs=H.264`,
      `video/${this.videoFormat}`,
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm'
    ];
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }
    return `video/${this.videoFormat}`;
  }

  async startRecording() {
    if (!this.stream) return;
    this.isRecording = true;
    this.isPaused = false;
    this.recordedChunks = [];
    this.recordingStartTime = Date.now();
    this.elapsedTime = 0;
    const mimeType = this.getSupportedMimeType();
    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };
    this.mediaRecorder.onstop = async () => {
      const blobType = mimeType.startsWith('video/mp4') ? 'video/mp4' : 'video/webm';
      const blob = new Blob(this.recordedChunks, { type: blobType });
      const size = blob.size;
      const url = URL.createObjectURL(blob);
      const thumbnail = this.generateThumbnail();
      this.videos.push({ url, thumbnail, timestamp: new Date(), size });
      this.saveVideosToStorage();
      this.showToast('Vídeo gravado com sucesso, veja a galeria ;)', 'success', 'toast-video-recorded', true);
      this.stopTimer();
    };
    this.mediaRecorder.start();
    this.startTimer();
  }

  togglePauseRecording() {
    if (this.isRecording) {
      if (this.isPaused) {
        this.resumeRecording();
      } else {
        this.pauseRecording();
      }
    }
  }

  pauseRecording() {
    if (this.mediaRecorder && this.isRecording && !this.isPaused) {
      this.mediaRecorder.pause();
      this.isPaused = true;
      this.stopTimer();
    }
  }

  resumeRecording() {
    if (this.mediaRecorder && this.isRecording && this.isPaused) {
      this.mediaRecorder.resume();
      this.isPaused = false;
      this.recordingStartTime = Date.now() - this.elapsedTime;
      this.startTimer();
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.isPaused = false;
      this.stopTimer();
    }
  }

  private startTimer() {
    this.recordingTimer = setTimeout(() => {
      this.stopRecording();
    }, (this.maxRecordingTime * 1000) - this.elapsedTime);
    this.timerInterval = setInterval(() => {
      if (!this.isPaused) {
        this.elapsedTime = Date.now() - this.recordingStartTime;
      }
    }, 100);
  }

  private stopTimer() {
    clearTimeout(this.recordingTimer);
    clearInterval(this.timerInterval);
    this.elapsedTime = 0;
  }

  formatRecordingTime(): string {
    const elapsedSeconds = Math.floor(this.elapsedTime / 1000);
    return this.formatTime(elapsedSeconds);
  }

  formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private generateThumbnail(): string {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (canvas) {
      return canvas.toDataURL('image/png');
    }
    return 'https://via.placeholder.com/150';
  }

  openVideoPreview(index: number) {
    if (index >= 0 && index < this.videos.length) {
      this.selectedVideoUrl = this.videos[index].url;
      this.isVideoPreviewOpen = true;
    }
  }

  closeVideoPreview() {
    this.isVideoPreviewOpen = false;
    this.selectedVideoUrl = null;
  }

  async downloadVideo(index: number) {
    const video = this.videos[index];
    const link = document.createElement('a');
    link.href = video.url;
    link.download = `video_${video.timestamp.toISOString()}.${this.videoFormat}`;
    link.click();
    this.showToast('Vídeo baixado :)', 'success', 'toast-video-downloaded');
  }

  async copyVideo(index: number) {
    const video = this.videos[index];
    try {
      const response = await fetch(video.url);
      const blob = await response.blob();
      const mimeType = `video/${this.videoFormat}`;
      await navigator.clipboard.write([new ClipboardItem({ [mimeType]: blob })]);
      this.showToast('Vídeo copiado :)', 'success', 'toast-video-copied');
    } catch (error) {
      console.error('Erro ao copiar vídeo:', error);
      this.showToast('Erro ao copiar vídeo :(', 'danger', 'toast-error');
    }
  }

  async deleteVideo(index: number) {
    const alert = await this.alertController.create({
      header: 'Confirmar Exclusão',
      message: 'Tem certeza que deseja deletar este vídeo?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Deletar',
          handler: () => {
            this.videos.splice(index, 1);
            this.saveVideosToStorage();
            this.showToast('Vídeo deletado :(', 'danger', 'toast-video-deleted');
          }
        }
      ]
    });
    await alert.present();
  }

  openGallery() { this.isGalleryOpen = true; }
  closeGallery() { this.isGalleryOpen = false; }

  async savePhoto(index: number) {
    const photo = this.photos[index];
    const mimeType = this.photoFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = this.photoFormat === 'jpeg' ? 0.8 : 1.0;
    let photoUrl = photo.url;
    if (photo.url.includes('image/png') && this.photoFormat === 'jpeg') {
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.src = photo.url;
      await new Promise((resolve) => { img.onload = resolve; });
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        photoUrl = canvas.toDataURL('image/jpeg', quality);
      }
    } else if (photo.url.includes('image/jpeg') && this.photoFormat === 'png') {
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.src = photo.url;
      await new Promise((resolve) => { img.onload = resolve; });
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        photoUrl = canvas.toDataURL('image/png');
      }
    }
    const link = document.createElement('a');
    link.href = photoUrl;
    link.download = `photo_${photo.timestamp.toISOString()}.${this.photoFormat}`;
    link.click();
    this.showToast('Imagem salva :)', 'success', 'toast-photo-saved');
  }

  async copyPhoto(index: number) {
    const photo = this.photos[index];
    try {
      const mimeType = this.photoFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
      const quality = this.photoFormat === 'jpeg' ? 0.8 : 1.0;
      let photoUrl = photo.url;
      if (photo.url.includes('image/png') && this.photoFormat === 'jpeg') {
        const canvas = document.createElement('canvas');
        const img = new Image();
        img.src = photo.url;
        await new Promise((resolve) => { img.onload = resolve; });
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          photoUrl = canvas.toDataURL('image/jpeg', quality);
        }
      } else if (photo.url.includes('image/jpeg') && this.photoFormat === 'png') {
        const canvas = document.createElement('canvas');
        const img = new Image();
        img.src = photo.url;
        await new Promise((resolve) => { img.onload = resolve; });
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          photoUrl = canvas.toDataURL('image/png');
        }
      }
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [mimeType]: blob })]);
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
    this.saveSettingsToStorage();
  }

  toggleFlipVertical() {
    this.flipVertical = !this.flipVertical;
    this.saveSettingsToStorage();
  }

  onZoomChange(event: any) {
    this.zoomLevel = event.detail.value;
    this.saveSettingsToStorage();
  }

  onPhotoFormatChange() {
    this.saveSettingsToStorage();
  }

  onVideoFormatChange() {
    this.saveSettingsToStorage();
    if (this.stream) {
      this.startCamera(); // Restart camera to apply new video format
    }
  }

  resetSettings() {
    this.flipHorizontal = false;
    this.flipVertical = false;
    this.zoomLevel = 1;
    this.selectedDeviceId = '';
    this.photoFormat = 'png';
    this.videoFormat = 'mp4';
    this.saveSettingsToStorage();
    if (this.stream) {
      this.startCamera();
    }
  }

  onRangeDragStart() {
    const modal = document.querySelector('ion-modal#settings-modal') as HTMLIonModalElement;
    if (modal) modal.classList.add('transparent');
  }

  onRangeDragEnd() {
    const modal = document.querySelector('ion-modal#settings-modal') as HTMLIonModalElement;
    if (modal) modal.classList.remove('transparent');
  }

 iniciarAR() {
  this.router.navigate(['/teste-ar']);
}

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
