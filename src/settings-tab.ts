import { App, PluginSettingTab, Setting } from 'obsidian';
import type VaultDashboardPlugin from './main';

export class VaultDashboardSettingTab extends PluginSettingTab {
  plugin: VaultDashboardPlugin;

  constructor(app: App, plugin: VaultDashboardPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Vault Dashboard' });

    // ── Widget visibility ──
    containerEl.createEl('h3', { text: 'Widgets' });

    const widgetNames: Record<string, string> = {
      flipClock: 'Flip Clock',
      weather: 'Weather',
      quote: 'Daily Quote',
      photo: 'Random Photo',
      heatmap: 'Activity Heatmap',
      calendar: 'Calendar',
      youtube: 'YouTube Player',
    };

    for (const [key, label] of Object.entries(widgetNames)) {
      new Setting(containerEl)
        .setName(label)
        .addToggle(toggle => toggle
          .setValue(this.plugin.settings.widgets[key as keyof typeof this.plugin.settings.widgets])
          .onChange(async (value) => {
            (this.plugin.settings.widgets as Record<string, boolean>)[key] = value;
            await this.plugin.saveSettings();
          }));
    }

    // ── Weather cities ──
    containerEl.createEl('h3', { text: 'Weather Cities' });

    const citiesContainer = containerEl.createDiv('vd-cities-list');
    this.renderCities(citiesContainer);

    new Setting(containerEl)
      .addButton(btn => btn
        .setButtonText('Add city')
        .onClick(() => {
          this.plugin.settings.cities.push('');
          this.renderCities(citiesContainer);
          this.plugin.saveSettings();
        }));

    // ── YouTube ──
    containerEl.createEl('h3', { text: 'YouTube' });

    new Setting(containerEl)
      .setName('Video or Playlist ID')
      .setDesc('YouTube video ID, playlist ID, or full URL')
      .addText(text => text
        .setPlaceholder('jfKfPfyJRdk')
        .setValue(this.plugin.settings.youtubeId)
        .onChange(async (value) => {
          this.plugin.settings.youtubeId = value;
          await this.plugin.saveSettings();
        }));
  }

  private renderCities(container: HTMLElement): void {
    container.empty();
    const cities = this.plugin.settings.cities;
    cities.forEach((city, i) => {
      const row = container.createDiv({ cls: 'vd-city-row' });
      const input = row.createEl('input', { type: 'text', value: city, cls: 'vd-city-input' });
      input.placeholder = 'City name';
      input.addEventListener('change', async () => {
        cities[i] = input.value;
        await this.plugin.saveSettings();
      });
      const removeBtn = row.createEl('button', { text: '×', cls: 'vd-city-remove' });
      removeBtn.addEventListener('click', async () => {
        cities.splice(i, 1);
        this.renderCities(container);
        await this.plugin.saveSettings();
      });
    });
  }
}
