import { Plugin, WorkspaceLeaf } from 'obsidian';
import { DashboardView, VIEW_TYPE_DASHBOARD } from './view';
import { VaultDashboardSettings, DEFAULT_SETTINGS } from './settings';
import { VaultDashboardSettingTab } from './settings-tab';

export default class VaultDashboardPlugin extends Plugin {
  settings: VaultDashboardSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addSettingTab(new VaultDashboardSettingTab(this.app, this));

    this.registerView(VIEW_TYPE_DASHBOARD, (leaf: WorkspaceLeaf) =>
      new DashboardView(leaf, this)
    );

    this.addRibbonIcon('layout-dashboard', 'Open dashboard', () => {
      void this.activateView();
    });

    this.addCommand({
      id: 'open-dashboard',
      name: 'Open dashboard',
      callback: () => void this.activateView(),
    });
  }

  onunload(): void {
    // Obsidian automatically detaches views on plugin unload
  }

  async loadSettings(): Promise<void> {
    const saved = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
    this.settings.widgets = Object.assign({}, DEFAULT_SETTINGS.widgets, saved?.widgets);
    this.settings.pomodoro = Object.assign({}, DEFAULT_SETTINGS.pomodoro, saved?.pomodoro);
    // Migrate legacy single youtubeId to playlist
    if (!this.settings.youtubePlaylist || this.settings.youtubePlaylist.length === 0) {
      const legacyId = this.settings.youtubeId || DEFAULT_SETTINGS.youtubeId;
      this.settings.youtubePlaylist = [{ name: 'Default', id: legacyId }];
    }
    // Migrate old row-based layout to grid-based
    if (this.settings.layout?.length > 0 && !('colSpan' in this.settings.layout[0])) {
      this.settings.layout = DEFAULT_SETTINGS.layout;
      await this.saveData(this.settings);
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async activateView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_DASHBOARD);
    if (existing.length > 0) {
      void this.app.workspace.revealLeaf(existing[0]);
      return;
    }

    const leaf = this.app.workspace.getLeaf('tab');
    await leaf.setViewState({ type: VIEW_TYPE_DASHBOARD, active: true });
    void this.app.workspace.revealLeaf(leaf);
  }
}
