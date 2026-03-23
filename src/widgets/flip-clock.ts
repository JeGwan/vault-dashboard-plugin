import type { DashboardWidget } from './base';

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

export class FlipClockWidget implements DashboardWidget {
  id = 'flip-clock';
  name = 'Flip Clock';
  private el!: HTMLElement;
  private timer: number | null = null;
  private prev: Record<string, string> = {};

  render(container: HTMLElement): void {
    this.el = container.createDiv({ cls: 'vd-card vd-clock' });
    const row = this.el.createDiv({ cls: 'fc-row' });

    const groups = [
      { digits: ['h1', 'h2'], sep: true },
      { digits: ['m1', 'm2'], sep: true },
      { digits: ['s1', 's2'], sep: false },
    ];

    for (const group of groups) {
      const pair = row.createDiv({ cls: 'fc-pair' });
      for (const id of group.digits) {
        const card = pair.createDiv({ cls: 'fc-card', attr: { 'data-id': id } });
        const upper = card.createDiv({ cls: 'fc-upper' });
        upper.createSpan({ text: '0' });
        const lower = card.createDiv({ cls: 'fc-lower' });
        lower.createSpan({ text: '0' });
        card.createDiv({ cls: 'fc-divider' });
      }
      if (group.sep) {
        const dots = row.createDiv({ cls: 'fc-dots' });
        dots.createSpan();
        dots.createSpan();
      }
    }

    this.el.createDiv({ cls: 'fc-date' });
    this.update();
    this.timer = window.setInterval(() => this.update(), 1000);
  }

  private update(): void {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');

    const digits: [string, string][] = [
      ['h1', h[0]], ['h2', h[1]], ['m1', m[0]], ['m2', m[1]], ['s1', s[0]], ['s2', s[1]],
    ];

    for (const [id, val] of digits) {
      if (this.prev[id] === val) continue;
      const card = this.el.querySelector<HTMLElement>(`[data-id="${id}"]`);
      if (!card) continue;

      const upperSpan = card.querySelector('.fc-upper span') as HTMLElement;
      const lowerSpan = card.querySelector('.fc-lower span') as HTMLElement;

      // Remove old flaps
      card.querySelectorAll('.fc-flap-top, .fc-flap-bottom').forEach(f => f.remove());

      const oldVal = this.prev[id] || '0';

      // Top flap: shows OLD value, flips down to reveal new value underneath
      const flapTop = document.createElement('div');
      flapTop.className = 'fc-flap-top';
      flapTop.createSpan({ text: oldVal });
      card.appendChild(flapTop);

      // Bottom flap: shows NEW value, flips up from bottom
      const flapBottom = document.createElement('div');
      flapBottom.className = 'fc-flap-bottom';
      flapBottom.createSpan({ text: val });
      card.appendChild(flapBottom);

      // Upper: update immediately (hidden behind flap-top)
      upperSpan.textContent = val;
      // Lower: keep old value, update when flap-bottom starts covering it
      setTimeout(() => { if (lowerSpan) lowerSpan.textContent = val; }, 280);

      // Cleanup after animation
      setTimeout(() => {
        flapTop.remove();
        flapBottom.remove();
      }, 650);

      this.prev[id] = val;
    }

    const dateEl = this.el.querySelector<HTMLElement>('.fc-date');
    if (dateEl) {
      dateEl.textContent = `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${DAYS_KO[now.getDay()]}요일`;
    }
  }

  destroy(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }
}
