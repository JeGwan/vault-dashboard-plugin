import { requestUrl } from 'obsidian';
import type { DashboardWidget } from './base';

export class RandomPhotoWidget implements DashboardWidget {
  id = 'random-photo';
  name = 'Random Photo';
  private el!: HTMLElement;
  private imgEl!: HTMLImageElement;
  private captionEl!: HTMLElement;

  render(container: HTMLElement): void {
    this.el = container.createDiv({ cls: 'vd-card vd-photo' });
    const wrap = this.el.createDiv({ cls: 'vd-photo-wrap' });
    this.imgEl = wrap.createEl('img', { cls: 'vd-photo-img' });
    this.captionEl = wrap.createDiv({ cls: 'vd-photo-caption' });

    const refreshBtn = this.el.createEl('button', { cls: 'vd-photo-refresh', text: '↻' });
    refreshBtn.title = '다른 사진';
    refreshBtn.addEventListener('click', (e) => { e.stopPropagation(); this.loadPhoto(); });

    this.loadPhoto();
  }

  private loadPhoto(): void {
    const seed = Date.now();
    this.imgEl.src = `https://picsum.photos/seed/${seed}/600/300`;
    this.imgEl.onerror = () => { this.imgEl.src = `https://picsum.photos/600/300?random=${seed}`; };
    this.captionEl.textContent = '';

    void requestUrl(`https://picsum.photos/seed/${seed}/info`)
      .then(res => {
        const info = res.json;
        if (info.author) this.captionEl.textContent = `📷 ${info.author}`;
      })
      .catch(() => {});
  }

  destroy(): void {}
}
