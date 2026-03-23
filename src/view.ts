import { ItemView, WorkspaceLeaf } from 'obsidian';
import type VaultDashboardPlugin from './main';
import type { DashboardWidget, WidgetContext } from './widgets/base';
import type { WidgetPlacement } from './settings';
import { DEFAULT_LAYOUT, WIDGET_MIN_SIZE } from './settings';
import { FlipClockWidget } from './widgets/flip-clock';
import { WeatherWidget } from './widgets/weather';
import { DailyQuoteWidget } from './widgets/daily-quote';
import { RandomPhotoWidget } from './widgets/random-photo';
import { ActivityHeatmapWidget } from './widgets/activity-heatmap';
import { CalendarWidget } from './widgets/calendar';
import { YouTubePlayerWidget } from './widgets/youtube-player';

export const VIEW_TYPE_DASHBOARD = 'vault-dashboard';

const WIDGET_FACTORIES: Record<string, () => DashboardWidget> = {
  'flip-clock': () => new FlipClockWidget(),
  'weather': () => new WeatherWidget(),
  'daily-quote': () => new DailyQuoteWidget(),
  'random-photo': () => new RandomPhotoWidget(),
  'youtube-player': () => new YouTubePlayerWidget(),
  'calendar': () => new CalendarWidget(),
  'activity-heatmap': () => new ActivityHeatmapWidget(),
};

const WIDGET_SETTING_KEY: Record<string, string> = {
  'flip-clock': 'flipClock',
  'weather': 'weather',
  'daily-quote': 'quote',
  'random-photo': 'photo',
  'youtube-player': 'youtube',
  'calendar': 'calendar',
  'activity-heatmap': 'heatmap',
};

export class DashboardView extends ItemView {
  plugin: VaultDashboardPlugin;
  private widgets: DashboardWidget[] = [];
  private grid!: HTMLElement;
  private editMode = false;
  private placementMap = new Map<string, WidgetPlacement>();

  constructor(leaf: WorkspaceLeaf, plugin: VaultDashboardPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string { return VIEW_TYPE_DASHBOARD; }
  getDisplayText(): string { return 'Dashboard'; }
  getIcon(): string { return 'layout-dashboard'; }

  async onOpen(): Promise<void> {
    const root = this.contentEl;
    root.empty();
    root.addClass('vault-dashboard-view');

    // Edit mode toggle
    const toolbar = root.createDiv({ cls: 'vd-toolbar' });
    const editBtn = toolbar.createEl('button', { cls: 'vd-edit-btn', text: '✎ Edit' });
    editBtn.addEventListener('click', () => {
      this.editMode = !this.editMode;
      this.grid.classList.toggle('vd-edit-mode', this.editMode);
      editBtn.textContent = this.editMode ? '✓ Done' : '✎ Edit';
      editBtn.classList.toggle('active', this.editMode);
      if (!this.editMode) this.saveLayout();
    });

    const cols = this.plugin.settings.gridCols || 4;
    this.grid = root.createDiv({ cls: 'vd-grid' });
    this.grid.style.setProperty('--vd-cols', String(cols));

    const ctx: WidgetContext = { app: this.app, settings: this.plugin.settings };
    const layout = this.getLayout();

    for (const p of layout) {
      const settingKey = WIDGET_SETTING_KEY[p.id];
      if (settingKey && !this.plugin.settings.widgets[settingKey as keyof typeof this.plugin.settings.widgets]) continue;
      const factory = WIDGET_FACTORIES[p.id];
      if (!factory) continue;

      this.placementMap.set(p.id, { ...p });
      const widget = factory();
      this.widgets.push(widget);

      const wrapper = this.grid.createDiv({ cls: 'vd-widget-wrapper' });
      wrapper.dataset.widgetId = p.id;
      this.applyGridPosition(wrapper, p);

      widget.render(wrapper, ctx);

      // Resize handle (visible in edit mode)
      const handle = wrapper.createDiv({ cls: 'vd-resize-handle' });
      handle.innerHTML = '⇲';
      this.enableResize(wrapper, handle, p);
      this.enableDrag(wrapper, p);
    }
  }

  private getLayout(): WidgetPlacement[] {
    const saved = this.plugin.settings.layout;
    if (saved && saved.length > 0) return saved;
    return DEFAULT_LAYOUT;
  }

  private applyGridPosition(el: HTMLElement, p: WidgetPlacement): void {
    el.style.gridColumn = `${p.col + 1} / span ${p.colSpan}`;
    el.style.gridRow = `${p.row + 1} / span ${p.rowSpan}`;
  }

  private saveLayout(): void {
    const layout: WidgetPlacement[] = [];
    this.placementMap.forEach((p) => layout.push({ ...p }));
    this.plugin.settings.layout = layout;
    this.plugin.saveSettings();
  }

  /** Drag to move widget on the grid */
  private enableDrag(wrapper: HTMLElement, placement: WidgetPlacement): void {
    let longPressTimer: number | null = null;
    let isDragging = false;
    let startX = 0, startY = 0;
    let ghostEl: HTMLElement | null = null;

    const onPointerDown = (e: PointerEvent) => {
      if (!this.editMode) return;
      const tag = (e.target as HTMLElement).tagName;
      if (['BUTTON', 'INPUT', 'A', 'CANVAS', 'IMG'].includes(tag)) return;
      if ((e.target as HTMLElement).classList.contains('vd-resize-handle')) return;

      startX = e.clientX;
      startY = e.clientY;

      longPressTimer = window.setTimeout(() => {
        isDragging = true;
        wrapper.classList.add('vd-widget-dragging');

        ghostEl = document.createElement('div');
        ghostEl.className = 'vd-drag-ghost';
        const rect = wrapper.getBoundingClientRect();
        ghostEl.style.width = `${rect.width}px`;
        ghostEl.style.height = `${rect.height}px`;
        ghostEl.style.left = `${rect.left}px`;
        ghostEl.style.top = `${rect.top}px`;
        document.body.appendChild(ghostEl);
      }, 300);

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp, { once: true });
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging && longPressTimer) {
        if (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
        }
        return;
      }
      if (!isDragging || !ghostEl) return;
      e.preventDefault();

      ghostEl.style.left = `${e.clientX - ghostEl.offsetWidth / 2}px`;
      ghostEl.style.top = `${e.clientY - ghostEl.offsetHeight / 2}px`;

      // Calculate grid cell under cursor
      const gridRect = this.grid.getBoundingClientRect();
      const cols = this.plugin.settings.gridCols || 4;
      const cellW = gridRect.width / cols;
      const cellH = 160; // approximate row height
      const col = Math.max(0, Math.min(cols - placement.colSpan, Math.floor((e.clientX - gridRect.left) / cellW)));
      const row = Math.max(0, Math.floor((e.clientY - gridRect.top) / cellH));

      // Live preview position
      placement.col = col;
      placement.row = row;
      this.applyGridPosition(wrapper, placement);
    };

    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove);
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
      if (isDragging) {
        wrapper.classList.remove('vd-widget-dragging');
        ghostEl?.remove();
        ghostEl = null;
        isDragging = false;
        this.saveLayout();
      }
    };

    wrapper.addEventListener('pointerdown', onPointerDown);
  }

  /** Resize handle: drag to change colSpan/rowSpan */
  private enableResize(wrapper: HTMLElement, handle: HTMLElement, placement: WidgetPlacement): void {
    let startX = 0, startY = 0;
    let startColSpan = 0, startRowSpan = 0;

    handle.addEventListener('pointerdown', (e: PointerEvent) => {
      if (!this.editMode) return;
      e.stopPropagation();
      e.preventDefault();

      startX = e.clientX;
      startY = e.clientY;
      startColSpan = placement.colSpan;
      startRowSpan = placement.rowSpan;
      wrapper.classList.add('vd-widget-resizing');

      const cols = this.plugin.settings.gridCols || 4;
      const gridRect = this.grid.getBoundingClientRect();
      const cellW = gridRect.width / cols;
      const cellH = 160;
      const minSize = WIDGET_MIN_SIZE[placement.id] || { minCol: 1, minRow: 1 };

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const newColSpan = Math.max(minSize.minCol, Math.min(cols - placement.col, startColSpan + Math.round(dx / cellW)));
        const newRowSpan = Math.max(minSize.minRow, startRowSpan + Math.round(dy / cellH));
        placement.colSpan = newColSpan;
        placement.rowSpan = newRowSpan;
        this.applyGridPosition(wrapper, placement);
      };

      const onUp = () => {
        document.removeEventListener('pointermove', onMove);
        wrapper.classList.remove('vd-widget-resizing');
        this.saveLayout();
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp, { once: true });
    });
  }

  async onClose(): Promise<void> {
    for (const w of this.widgets) w.destroy?.();
    this.widgets = [];
  }
}
