import type { DashboardWidget, WidgetContext } from './base';

export class ActivityHeatmapWidget implements DashboardWidget {
  id = 'activity-heatmap';
  name = 'Activity Heatmap';
  private el!: HTMLElement;

  render(container: HTMLElement, ctx: WidgetContext): void {
    this.el = container.createDiv({ cls: 'vd-card vd-heatmap' });
    this.el.createDiv({ cls: 'vd-heatmap-title', text: 'Activity' });
    this.buildHeatmap(ctx);
  }

  refresh(ctx: WidgetContext): void {
    this.el.empty();
    this.el.createDiv({ cls: 'vd-heatmap-title', text: 'Activity' });
    this.buildHeatmap(ctx);
  }

  private buildHeatmap(ctx: WidgetContext): void {
    const files = ctx.app.vault.getFiles();
    const countMap: Record<string, number> = {};
    let maxCount = 0;

    for (const file of files) {
      const day = new Date(file.stat.mtime).toISOString().slice(0, 10);
      countMap[day] = (countMap[day] || 0) + 1;
      if (countMap[day] > maxCount) maxCount = countMap[day];
    }

    const today = new Date();
    const weeks: (CellData | null)[][] = [];
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (26 * 7) + (7 - startDate.getDay()));

    let currentWeek: (CellData | null)[] = [];
    const d = new Date(startDate);
    for (let i = 0; i < d.getDay(); i++) currentWeek.push(null);

    while (d <= today) {
      const key = d.toISOString().slice(0, 10);
      const count = countMap[key] || 0;
      const level = count === 0 ? 0 : count <= maxCount * 0.25 ? 1 : count <= maxCount * 0.5 ? 2 : count <= maxCount * 0.75 ? 3 : 4;
      currentWeek.push({ key, count, level });
      if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
      d.setDate(d.getDate() + 1);
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    // Month labels
    const months: { col: number; label: string }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < weeks.length; w++) {
      const firstCell = weeks[w].find((c): c is CellData => c !== null);
      if (firstCell) {
        const m = new Date(firstCell.key).getMonth();
        if (m !== lastMonth) {
          months.push({ col: w, label: new Date(firstCell.key).toLocaleString('ko-KR', { month: 'short' }) });
          lastMonth = m;
        }
      }
    }

    // Render months
    const monthsEl = this.el.createDiv({ cls: 'vd-heatmap-months' });
    let colIdx = 0;
    for (const m of months) {
      const gap = m.col - colIdx;
      if (gap > 0) monthsEl.createSpan({ attr: { style: `width:${gap * 15}px` } });
      monthsEl.createSpan({ text: m.label });
      colIdx = m.col + 1;
    }

    // Render grid
    const gridWrap = this.el.createDiv({ cls: 'vd-heatmap-container' });
    const days = gridWrap.createDiv({ cls: 'vd-heatmap-days' });
    for (const d of ['', 'Mon', '', 'Wed', '', 'Fri', '']) {
      days.createSpan({ text: d });
    }

    const grid = gridWrap.createDiv({ cls: 'vd-heatmap-grid' });
    for (const week of weeks) {
      const weekEl = grid.createDiv({ cls: 'vd-heatmap-week' });
      for (let i = 0; i < 7; i++) {
        const cell = week[i];
        const cellEl = weekEl.createDiv({ cls: 'vd-heatmap-cell' });
        if (cell) {
          cellEl.dataset.level = String(cell.level);
          cellEl.dataset.count = String(cell.count);
          cellEl.dataset.date = cell.key;
          cellEl.title = `${cell.key}: ${cell.count} files`;
        }
      }
    }

    // Legend
    const legend = this.el.createDiv({ cls: 'vd-heatmap-legend' });
    legend.createSpan({ text: 'Less ' });
    for (let l = 0; l <= 4; l++) {
      const c = legend.createDiv({ cls: 'vd-heatmap-cell' });
      c.dataset.level = String(l);
    }
    legend.createSpan({ text: ' More' });
  }

  destroy(): void {}
}

interface CellData { key: string; count: number; level: number; }
