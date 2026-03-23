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

    this.addRibbonIcon('layout-dashboard', 'Open Dashboard', () => {
      this.activateView();
    });

    this.addCommand({
      id: 'open-dashboard',
      name: 'Open vault dashboard',
      callback: () => this.activateView(),
    });
  }

  async onunload(): Promise<void> {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_DASHBOARD);
  }

  async loadSettings(): Promise<void> {
    const saved = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);
    this.settings.widgets = Object.assign({}, DEFAULT_SETTINGS.widgets, this.settings.widgets);
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
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }

    const leaf = this.app.workspace.getLeaf('tab');
    await leaf.setViewState({ type: VIEW_TYPE_DASHBOARD, active: true });
    this.app.workspace.revealLeaf(leaf);
  }
}
