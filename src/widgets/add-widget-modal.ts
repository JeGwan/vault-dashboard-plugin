import { Modal, FuzzySuggestModal, TFile, App } from 'obsidian';
import type { DashboardView } from '../view';

const AVAILABLE_WIDGETS = [
  { id: 'note', icon: '\ud83d\udcdd', name: 'Note', desc: 'Vault note preview widget' },
  { id: 'flip-clock', icon: '\ud83d\udd50', name: 'Flip clock', desc: 'Flip clock' },
  { id: 'weather', icon: '\ud83c\udf24', name: 'Weather', desc: 'Weather widget' },
  { id: 'daily-quote', icon: '\ud83d\udcac', name: 'Daily quote', desc: 'Daily quote' },
  { id: 'random-photo', icon: '\ud83d\udcf7', name: 'Random photo', desc: 'Random photo' },
  { id: 'youtube-player', icon: '\ud83c\udfb5', name: 'YouTube player', desc: 'YouTube player' },
  { id: 'calendar', icon: '\ud83d\udcc5', name: 'Calendar', desc: 'Calendar' },
  { id: 'activity-heatmap', icon: '\ud83d\udcca', name: 'Activity heatmap', desc: 'Activity heatmap' },
];

export class AddWidgetModal extends Modal {
  view: DashboardView;

  constructor(app: App, view: DashboardView) {
    super(app);
    this.view = view;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h3', { text: 'Add widget', cls: 'vd-modal-title' });
    const grid = contentEl.createDiv({ cls: 'vd-widget-picker-grid' });
    for (const w of AVAILABLE_WIDGETS) {
      const item = grid.createDiv({ cls: 'vd-widget-picker-item' });
      item.createSpan({ cls: 'vd-widget-picker-icon', text: w.icon });
      const info = item.createDiv({ cls: 'vd-widget-picker-info' });
      info.createDiv({ cls: 'vd-widget-picker-name', text: w.name });
      info.createDiv({ cls: 'vd-widget-picker-desc', text: w.desc });
      item.addEventListener('click', () => {
        this.close();
        if (w.id === 'note') {
          this.openNotePicker();
        } else {
          void this.view.addBuiltinWidget(w.id);
        }
      });
    }
  }

  openNotePicker(): void {
    const files = this.app.vault.getMarkdownFiles();
    const modal = new NotePickerModal(this.app, files, (file) => {
      void this.view.addNoteWidget(file.path);
    });
    modal.open();
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

class NotePickerModal extends FuzzySuggestModal<TFile> {
  files: TFile[];
  onChooseCb: (file: TFile) => void;

  constructor(app: App, files: TFile[], onChoose: (file: TFile) => void) {
    super(app);
    this.files = files;
    this.onChooseCb = onChoose;
    this.setPlaceholder('Search notes...');
  }

  getItems(): TFile[] {
    return this.files;
  }

  getItemText(item: TFile): string {
    return item.path;
  }

  onChooseItem(item: TFile): void {
    this.onChooseCb(item);
  }
}
