import type { DashboardWidget, WidgetContext } from './base';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

function parseYTInput(raw: string): { videoId: string | null; listId: string | null } {
  const urlMatch = raw.match(/[?&]list=([^&]+)/);
  const vidMatch = raw.match(/[?&]v=([^&]+)/) || raw.match(/youtu\.be\/([^?&]+)/);
  if (urlMatch) return { listId: urlMatch[1], videoId: null };
  if (vidMatch) return { videoId: vidMatch[1], listId: null };
  if (raw.startsWith('PL')) return { listId: raw, videoId: null };
  return { videoId: raw, listId: null };
}

function fmtTime(sec: number): string {
  if (!sec || !isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export class YouTubePlayerWidget implements DashboardWidget {
  id = 'youtube-player';
  name = 'YouTube Player';
  private el!: HTMLElement;
  private player: any = null;
  private progressTimer: number | null = null;
  private fillEl!: HTMLElement;
  private curEl!: HTMLElement;
  private totEl!: HTMLElement;
  private playBtn!: HTMLElement;
  private titleEl!: HTMLElement;
  private artistEl!: HTMLElement;
  private thumbEl!: HTMLElement;

  render(container: HTMLElement, ctx: WidgetContext): void {
    this.el = container.createDiv({ cls: 'vd-card vd-music' });

    // Hidden player container
    this.el.createDiv({ cls: 'vd-yt-hidden' });

    // Info row
    const info = this.el.createDiv({ cls: 'vd-music-info' });
    this.thumbEl = info.createDiv({ cls: 'vd-music-thumb' });
    const text = info.createDiv({ cls: 'vd-music-text' });
    this.titleEl = text.createDiv({ cls: 'vd-music-title', text: 'Not playing' });
    this.artistEl = text.createDiv({ cls: 'vd-music-artist' });

    // Controls
    const controls = this.el.createDiv({ cls: 'vd-music-controls' });
    this.playBtn = controls.createEl('button', { cls: 'vd-music-btn', text: '▶' });
    this.playBtn.addEventListener('click', () => this.togglePlay());

    const muteBtn = controls.createEl('button', { cls: 'vd-music-btn vd-music-mute', text: '🔊' });
    muteBtn.addEventListener('click', () => {
      if (!this.player) return;
      if (this.player.isMuted()) { this.player.unMute(); muteBtn.textContent = '🔊'; }
      else { this.player.mute(); muteBtn.textContent = '🔇'; }
    });

    const volume = controls.createEl('input', {
      cls: 'vd-music-volume',
      type: 'range',
      attr: { min: '0', max: '100', value: '50' },
    });
    volume.addEventListener('input', () => {
      if (this.player) {
        this.player.setVolume(parseInt(volume.value));
        if (this.player.isMuted()) this.player.unMute();
      }
    });

    // Progress bar
    const progressWrap = this.el.createDiv({ cls: 'vd-music-progress' });
    this.fillEl = progressWrap.createDiv({ cls: 'vd-music-progress-fill' });
    progressWrap.addEventListener('click', (e) => {
      if (!this.player?.getDuration) return;
      const rect = progressWrap.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      this.player.seekTo(ratio * this.player.getDuration(), true);
    });

    const timeRow = this.el.createDiv({ cls: 'vd-music-time' });
    this.curEl = timeRow.createSpan({ text: '0:00' });
    this.totEl = timeRow.createSpan({ text: '0:00' });

    this.loadMusic(ctx);
  }

  private loadMusic(ctx: WidgetContext): void {
    this.ensureYTAPI();
    const raw = ctx.settings.youtubeId || 'jfKfPfyJRdk';
    const { videoId, listId } = parseYTInput(raw);

    if (window.YT?.Player) {
      this.createPlayer(videoId, listId);
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        this.createPlayer(videoId, listId);
      };
    }
  }

  private ensureYTAPI(): void {
    if (window.YT?.Player) return;
    if (document.getElementById('vd-yt-api')) return;
    const tag = document.createElement('script');
    tag.id = 'vd-yt-api';
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }

  private createPlayer(videoId: string | null, listId: string | null): void {
    const container = this.el.querySelector('.vd-yt-hidden') as HTMLElement;
    if (!container) return;
    container.empty();
    const div = container.createDiv();

    const playerVars: Record<string, any> = { autoplay: 0, controls: 0, disablekb: 1, fs: 0, modestbranding: 1 };
    if (listId) { playerVars.listType = 'playlist'; playerVars.list = listId; }

    this.player = new window.YT.Player(div, {
      width: '1', height: '1',
      videoId: videoId || undefined,
      playerVars,
      events: {
        onReady: () => {
          this.player?.setVolume(50);
          this.updateInfo();
        },
        onStateChange: (e: any) => {
          this.updatePlayBtn();
          if (e.data === window.YT.PlayerState.PLAYING) {
            this.updateInfo();
            this.startProgress();
          } else {
            this.stopProgress();
          }
        },
      },
    });
  }

  private togglePlay(): void {
    if (!this.player) return;
    const state = this.player.getPlayerState?.();
    if (state === window.YT?.PlayerState?.PLAYING) this.player.pauseVideo();
    else this.player.playVideo();
    setTimeout(() => this.updatePlayBtn(), 100);
  }

  private updatePlayBtn(): void {
    if (!this.player?.getPlayerState) return;
    const playing = this.player.getPlayerState() === window.YT?.PlayerState?.PLAYING;
    this.playBtn.textContent = playing ? '⏸' : '▶';
  }

  private updateInfo(): void {
    if (!this.player?.getVideoData) return;
    const data = this.player.getVideoData();
    if (data.title) this.titleEl.textContent = data.title;
    if (data.author) this.artistEl.textContent = data.author;
    if (data.video_id) {
      this.thumbEl.empty();
      this.thumbEl.createEl('img', { attr: { src: `https://img.youtube.com/vi/${data.video_id}/default.jpg` } });
    }
  }

  private startProgress(): void {
    this.stopProgress();
    this.updateProgress();
    this.progressTimer = window.setInterval(() => this.updateProgress(), 500);
  }

  private stopProgress(): void {
    if (this.progressTimer !== null) { window.clearInterval(this.progressTimer); this.progressTimer = null; }
    this.updateProgress();
  }

  private updateProgress(): void {
    if (!this.player?.getCurrentTime || !this.player?.getDuration) return;
    const cur = this.player.getCurrentTime();
    const dur = this.player.getDuration();
    if (dur > 0) this.fillEl.style.width = `${(cur / dur) * 100}%`;
    this.curEl.textContent = fmtTime(cur);
    this.totEl.textContent = fmtTime(dur);
  }

  destroy(): void {
    this.stopProgress();
    if (this.player?.destroy) {
      try { this.player.destroy(); } catch { /* ignore */ }
      this.player = null;
    }
  }
}
