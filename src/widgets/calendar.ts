import { Component, MarkdownRenderer, TFile } from 'obsidian';
import type { DashboardWidget, WidgetContext } from './base';

export class CalendarWidget implements DashboardWidget {
  id = 'calendar';
  name = 'Calendar';
  private el!: HTMLElement;
  private calGrid!: HTMLElement;
  private previewEl!: HTMLElement;
  private calDate = new Date();
  private selectedDate: string | null = null;
  private ctx!: WidgetContext;

  render(container: HTMLElement, ctx: WidgetContext): void {
    this.ctx = ctx;
    this.el = container.createDiv({ cls: 'vd-card vd-calendar-widget' });

    // Calendar header
    const header = this.el.createDiv({ cls: 'vd-cal-header' });
    const prevBtn = header.createEl('button', { text: '‹', cls: 'vd-cal-nav' });
    header.createSpan({ cls: 'vd-cal-title' });
    const nextBtn = header.createEl('button', { text: '›', cls: 'vd-cal-nav' });

    prevBtn.addEventListener('click', () => {
      this.calDate.setMonth(this.calDate.getMonth() - 1);
      this.selectedDate = null;
      this.renderCalendar();
      this.previewEl.empty();
    });
    nextBtn.addEventListener('click', () => {
      this.calDate.setMonth(this.calDate.getMonth() + 1);
      this.selectedDate = null;
      this.renderCalendar();
      this.previewEl.empty();
    });

    this.calGrid = this.el.createDiv({ cls: 'vd-cal-grid' });
    this.calGrid.addEventListener('click', (e) => {
      const cell = (e.target as HTMLElement).closest<HTMLElement>('.vd-day-cell:not(.other-month)');
      if (!cell) return;
      const day = parseInt(cell.textContent || '');
      if (isNaN(day)) return;
      const year = this.calDate.getFullYear(), month = this.calDate.getMonth();
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      this.selectedDate = dateStr;
      this.calGrid.querySelectorAll('.vd-day-cell').forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
      void this.showDailyNote(dateStr);
    });

    this.previewEl = this.el.createDiv({ cls: 'vd-cal-preview' });

    this.renderCalendar();
    const today = new Date().toISOString().slice(0, 10);
    this.selectedDate = today;
    void this.showDailyNote(today);
  }

  private renderCalendar(): void {
    const now = new Date();
    const year = this.calDate.getFullYear(), month = this.calDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const titleEl = this.el.querySelector('.vd-cal-title') as HTMLElement;
    if (titleEl) titleEl.textContent = `${monthNames[month]} ${year}`;

    this.calGrid.empty();
    for (const d of dayNames) {
      this.calGrid.createDiv({ cls: 'vd-day-label', text: d });
    }
    for (let i = firstDay - 1; i >= 0; i--) {
      this.calGrid.createDiv({ cls: 'vd-day-cell other-month', text: String(daysInPrev - i) });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isSelected = this.selectedDate === dateStr;
      const cls = `vd-day-cell clickable${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`;
      this.calGrid.createDiv({ cls, text: String(d) });
    }
    const totalCells = firstDay + daysInMonth;
    const remaining = (7 - totalCells % 7) % 7;
    for (let d = 1; d <= remaining; d++) {
      this.calGrid.createDiv({ cls: 'vd-day-cell other-month', text: String(d) });
    }
  }

  private async showDailyNote(dateStr: string): Promise<void> {
    this.previewEl.empty();

    // Find the daily note for this date
    // Patterns: "1-인박스/오늘.md" (today), "2-일기/1-Daily/YY.MM.DD 일기.md"
    const vault = this.ctx.app.vault;
    const d = new Date(dateStr + 'T00:00:00');
    const yy = String(d.getFullYear()).slice(2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');

    const today = new Date().toISOString().slice(0, 10);
    const candidates: string[] = [];

    if (dateStr === today) {
      candidates.push('1-인박스/오늘.md');
    }
    candidates.push(`2-일기/1-Daily/${yy}.${mm}.${dd} 일기.md`);

    let content: string | null = null;
    let foundPath: string | null = null;

    for (const path of candidates) {
      const file = vault.getAbstractFileByPath(path);
      if (file && 'extension' in file) {
        try {
          content = await vault.cachedRead(file as TFile);
          foundPath = path;
          break;
        } catch { /* continue */ }
      }
    }

    if (!content) {
      this.previewEl.createDiv({ cls: 'vd-cal-empty', text: `${dateStr} — 데일리 노트 없음` });
      return;
    }

    // Header with file link
    const headerEl = this.previewEl.createDiv({ cls: 'vd-cal-note-header' });
    const link = headerEl.createEl('a', {
      cls: 'vd-cal-note-link',
      text: `📄 ${foundPath!.split('/').pop()?.replace('.md', '')}`,
    });
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const file = vault.getAbstractFileByPath(foundPath!);
      if (file) {
        void this.ctx.app.workspace.openLinkText(foundPath!, '', false);
      }
    });

    // Render markdown content (truncated)
    const bodyEl = this.previewEl.createDiv({ cls: 'vd-cal-note-body' });
    // Strip frontmatter
    const stripped = content.replace(/^---[\s\S]*?---\n?/, '');
    // Limit to reasonable length
    const truncated = stripped.length > 8000 ? stripped.slice(0, 8000) + '\n\n...' : stripped;

    try {
      await MarkdownRenderer.render(
        this.ctx.app,
        truncated,
        bodyEl,
        foundPath!,
        new Component(),
      );
    } catch {
      bodyEl.textContent = truncated;
    }
  }

  destroy(): void {}
}
