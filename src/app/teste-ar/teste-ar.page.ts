import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-teste-ar',
  templateUrl: './teste-ar.page.html',
  styleUrls: ['./teste-ar.page.scss'],
  standalone: false
})
export class TesteARPage implements OnInit, OnDestroy {
  public stream: MediaStream | null = null;
  facingMode: 'user' | 'environment' = 'environment'; // Câmera traseira para AR
  videoQuality: 'low' | 'medium' | 'high' = 'medium';
  flipHorizontal: boolean = false;
  flipVertical: boolean = false;
  zoomLevel: number = 1;
  isCameraVisible: boolean = true; // Controla visibilidade do feed
  is3DObjectVisible: boolean = true; // Controla visibilidade do objeto 3D
  private qualitySettings = {
    low: { width: 640, height: 480, frameRate: 30 },
    medium: { width: 1280, height: 720, frameRate: 30 },
    high: { width: 1920, height: 1080, frameRate: 30 }
  };

  constructor(private router: Router) {}

  async ngOnInit() {
    console.log('[TesteAR] ngOnInit: Inicializando página AR');
    await this.startARCamera();
    window.addEventListener('resize', this.adjustCanvasSize.bind(this));
    console.log('[TesteAR] ngOnInit: Event listener de resize adicionado');
  }

  ngOnDestroy() {
    console.log('[TesteAR] ngOnDestroy: Destruindo página AR');
    this.stopARCamera();
    window.removeEventListener('resize', this.adjustCanvasSize.bind(this));
    console.log('[TesteAR] ngOnDestroy: Event listener de resize removido');
  }

  private async startARCamera() {
    console.log('[TesteAR] startARCamera: Tentando iniciar câmera com facingMode:', this.facingMode, 'e qualidade:', this.videoQuality);
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: this.facingMode,
          width: { ideal: this.qualitySettings[this.videoQuality].width },
          height: { ideal: this.qualitySettings[this.videoQuality].height },
          frameRate: { ideal: this.qualitySettings[this.videoQuality].frameRate }
        },
        audio: false
      };
      console.log('[TesteAR] startARCamera: Constraints aplicados:', constraints);
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[TesteAR] startARCamera: Stream obtido com sucesso');
      const video = document.getElementById('video') as HTMLVideoElement;
      const canvas = document.getElementById('canvas') as HTMLCanvasElement;
      if (!video || !canvas) {
        console.error('[TesteAR] startARCamera: Elemento video ou canvas não encontrado');
        return;
      }
      video.srcObject = this.stream;
      this.adjustCanvasSize();
      console.log('[TesteAR] startARCamera: Canvas ajustado para tamanho:', canvas.width, 'x', canvas.height);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const render = () => {
          if (!this.isCameraVisible) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            requestAnimationFrame(render);
            return;
          }
          const zoom = this.zoomLevel;
          const srcWidth = video.videoWidth / zoom;
          const srcHeight = video.videoHeight / zoom;
          const srcX = (video.videoWidth - srcWidth) / 2;
          const srcY = (video.videoHeight - srcHeight) / 2;
          ctx.save();
          if (this.flipHorizontal) {
            ctx.scale(-1, 1);
            ctx.translate(-canvas.width, 0);
            console.log('[TesteAR] render: Aplicando flip horizontal');
          }
          if (this.flipVertical) {
            ctx.scale(1, -1);
            ctx.translate(0, -canvas.height);
            console.log('[TesteAR] render: Aplicando flip vertical');
          }
          ctx.drawImage(video, srcX, srcY, srcWidth, srcHeight, 0, 0, canvas.width, canvas.height);
          ctx.restore();
          requestAnimationFrame(render);
        };
        video.onloadedmetadata = () => {
          console.log('[TesteAR] video.onloadedmetadata: Metadados carregados:', video.videoWidth, 'x', video.videoHeight);
          render();
        };
        video.onerror = (err) => {
          console.error('[TesteAR] video.onerror: Erro no vídeo:', err);
          this.stopARCamera();
        };
      } else {
        console.error('[TesteAR] startARCamera: Falha ao obter contexto do canvas');
        this.stopARCamera();
      }
    } catch (error) {
      console.error('[TesteAR] startARCamera: Erro ao iniciar câmera:', error);
      if (this.videoQuality !== 'low') {
        console.log('[TesteAR] startARCamera: Tentando novamente com qualidade baixa');
        this.videoQuality = 'low';
        await this.startARCamera();
      } else {
        console.error('[TesteAR] startARCamera: Falha definitiva ao iniciar câmera');
        this.router.navigate(['/camera']);
      }
    }
  }

  private stopARCamera() {
    console.log('[TesteAR] stopARCamera: Parando câmera');
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        console.log('[TesteAR] stopARCamera: Parando track:', track.kind, track.label);
        track.stop();
      });
      this.stream = null;
      const video = document.getElementById('video') as HTMLVideoElement;
      const canvas = document.getElementById('canvas') as HTMLCanvasElement;
      if (video) {
        video.srcObject = null;
        console.log('[TesteAR] stopARCamera: Video srcObject limpo');
      }
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          console.log('[TesteAR] stopARCamera: Canvas limpo');
        }
      }
    }
  }

  private adjustCanvasSize() {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      console.log('[TesteAR] adjustCanvasSize: Canvas redimensionado para', canvas.width, 'x', canvas.height);
    } else {
      console.warn('[TesteAR] adjustCanvasSize: Canvas não encontrado');
    }
  }

  toggleCameraVisibility() {
    this.isCameraVisible = !this.isCameraVisible;
    console.log('[TesteAR] toggleCameraVisibility: Câmera visível:', this.isCameraVisible);
  }

  toggle3DObjectVisibility() {
    this.is3DObjectVisible = !this.is3DObjectVisible;
    console.log('[TesteAR] toggle3DObjectVisibility: Objeto 3D visível:', this.is3DObjectVisible);
    const model = document.querySelector('a-box') as any;
    if (model) {
      model.setAttribute('visible', this.is3DObjectVisible.toString());
    }
  }

  voltarParaCamera() {
    console.log('[TesteAR] voltarParaCamera: Navegando de volta para /camera');
    this.router.navigate(['/camera']);
  }
}
