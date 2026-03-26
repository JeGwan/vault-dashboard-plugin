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

    // ── Widget visibility ──
    new Setting(containerEl).setName('Widgets').setHeading();

    const widgetNames: Record<string, string> = {
      flipClock: 'Flip clock',
      weather: 'Weather',
      quote: 'Daily quote',
      photo: 'Random photo',
      heatmap: 'Activity heatmap',
      calendar: 'Calendar',
      youtube: 'YouTube player',
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
    new Setting(containerEl).setName('Weather cities').setHeading();

    const citiesContainer = containerEl.createDiv('vd-cities-list');
    this.renderCities(citiesContainer);

    new Setting(containerEl)
      .addButton(btn => btn
        .setButtonText('Add city')
        .onClick(() => {
          this.plugin.settings.cities.push('');
          this.renderCities(citiesContainer);
          void this.plugin.saveSettings();
        }));

    // ── Pomodoro ──
    new Setting(containerEl).setName('Pomodoro').setHeading();

    const pomo = this.plugin.settings.pomodoro;

    new Setting(containerEl)
      .setName('Focus duration (min)')
      .addText(text => text
        .setValue(String(pomo.workMin))
        .onChange(async (value) => {
          const n = parseInt(value, 10);
          if (n > 0) { pomo.workMin = n; await this.plugin.saveSettings(); }
        }));

    new Setting(containerEl)
      .setName('Break duration (min)')
      .addText(text => text
        .setValue(String(pomo.breakMin))
        .onChange(async (value) => {
          const n = parseInt(value, 10);
          if (n > 0) { pomo.breakMin = n; await this.plugin.saveSettings(); }
        }));

    new Setting(containerEl)
      .setName('Long break duration (min)')
      .addText(text => text
        .setValue(String(pomo.longBreakMin))
        .onChange(async (value) => {
          const n = parseInt(value, 10);
          if (n > 0) { pomo.longBreakMin = n; await this.plugin.saveSettings(); }
        }));

    new Setting(containerEl)
      .setName('Motto')
      .setDesc('Displayed above the timer')
      .addText(text => text
        .setValue(pomo.motto)
        .onChange(async (value) => {
          pomo.motto = value;
          await this.plugin.saveSettings();
        }));

    // ── Radio Stations ──
    new Setting(containerEl).setName('Radio stations').setHeading();
    new Setting(containerEl).setDesc('Default: SomaFM channels. Add custom MP3/AAC stream URLs.');

    const radioContainer = containerEl.createDiv('vd-cities-list');
    this.renderRadioStations(radioContainer);

    new Setting(containerEl)
      .addButton(btn => btn
        .setButtonText('Add station')
        .onClick(() => {
          if (!this.plugin.settings.radioStations) this.plugin.settings.radioStations = [];
          this.plugin.settings.radioStations.push({ name: '', url: '', infoUrl: '' });
          this.renderRadioStations(radioContainer);
          void this.plugin.saveSettings();
        }))
      .addButton(btn => btn
        .setButtonText('Reset to defaults')
        .onClick(() => {
          this.plugin.settings.radioStations = [];
          this.renderRadioStations(radioContainer);
          void this.plugin.saveSettings();
        }));
  }

  private renderRadioStations(container: HTMLElement): void {
    container.empty();
    const list = this.plugin.settings.radioStations ?? [];
    if (list.length === 0) {
      container.createDiv({ cls: 'setting-item-description', text: 'Using default SomaFM stations (Groove Salad, Lush, Drone Zone, DEF CON, Vaporwaves)' });
      return;
    }
    list.forEach((entry, i) => {
      const row = container.createDiv({ cls: 'vd-city-row' });
      const nameInput = row.createEl('input', { type: 'text', value: entry.name, cls: 'vd-city-input' });
      nameInput.placeholder = 'Station name';
      nameInput.style.maxWidth = '120px';
      nameInput.addEventListener('change', () => {
        list[i].name = nameInput.value;
        void this.plugin.saveSettings();
      });
      const urlInput = row.createEl('input', { type: 'text', value: entry.url, cls: 'vd-city-input' });
      urlInput.placeholder = 'Stream URL (mp3/aac)';
      urlInput.addEventListener('change', () => {
        list[i].url = urlInput.value;
        void this.plugin.saveSettings();
      });
      const removeBtn = row.createEl('button', { text: '×', cls: 'vd-city-remove' });
      removeBtn.addEventListener('click', () => {
        list.splice(i, 1);
        this.renderRadioStations(container);
        void this.plugin.saveSettings();
      });
    });
  }

  private renderPlaylist(container: HTMLElement): void {
    container.empty();
    const list = this.plugin.settings.youtubePlaylist;
    list.forEach((entry, i) => {
      const row = container.createDiv({ cls: 'vd-city-row' });
      const nameInput = row.createEl('input', { type: 'text', value: entry.name, cls: 'vd-city-input' });
      nameInput.placeholder = 'Name';
      nameInput.style.maxWidth = '100px';
      nameInput.addEventListener('change', () => {
        list[i].name = nameInput.value;
        void this.plugin.saveSettings();
      });
      const idInput = row.createEl('input', { type: 'text', value: entry.id, cls: 'vd-city-input' });
      idInput.placeholder = 'Video/playlist ID or URL';
      idInput.addEventListener('change', () => {
        list[i].id = idInput.value;
        void this.plugin.saveSettings();
        statusEl.textContent = '';
        statusEl.className = 'vd-embed-status';
      });
      const testBtn = row.createEl('button', { text: 'Test', cls: 'vd-embed-test-btn' });
      const statusEl = row.createEl('span', { cls: 'vd-embed-status' });
      testBtn.addEventListener('click', async () => {
        const rawId = idInput.value.trim();
        if (!rawId) { statusEl.textContent = 'Empty'; statusEl.className = 'vd-embed-status vd-embed-fail'; return; }
        statusEl.textContent = '...';
        statusEl.className = 'vd-embed-status';
        const vid = this.extractVideoId(rawId);
        if (!vid) { statusEl.textContent = 'Playlist (skip check)'; statusEl.className = 'vd-embed-status vd-embed-warn'; return; }
        try {
          const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`);
          if (res.ok) {
            const data = await res.json();
            statusEl.textContent = 'OK';
            statusEl.className = 'vd-embed-status vd-embed-ok';
            if (!nameInput.value && data.title) { nameInput.value = data.title; list[i].name = data.title; void this.plugin.saveSettings(); }
          } else {
            statusEl.textContent = res.status === 401 ? 'Embed blocked' : `Error ${res.status}`;
            statusEl.className = 'vd-embed-status vd-embed-fail';
          }
        } catch {
          statusEl.textContent = 'Network error';
          statusEl.className = 'vd-embed-status vd-embed-fail';
        }
      });
      const removeBtn = row.createEl('button', { text: '×', cls: 'vd-city-remove' });
      removeBtn.addEventListener('click', () => {
        list.splice(i, 1);
        this.renderPlaylist(container);
        void this.plugin.saveSettings();
      });
    });
  }

  private extractVideoId(raw: string): string | null {
    const vidMatch = raw.match(/[?&]v=([^&]+)/) || raw.match(/youtu\.be\/([^?&]+)/);
    if (vidMatch) return vidMatch[1];
    if (raw.startsWith('PL') || raw.match(/[?&]list=/)) return null; // playlist
    if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw; // bare video ID
    return null;
  }

  private renderCities(container: HTMLElement): void {
    container.empty();
    const cities = this.plugin.settings.cities;
    cities.forEach((city, i) => {
      const row = container.createDiv({ cls: 'vd-city-row' });
      const input = row.createEl('input', { type: 'text', value: city, cls: 'vd-city-input' });
      input.placeholder = 'City name';
      input.addEventListener('change', () => {
        cities[i] = input.value;
        void this.plugin.saveSettings();
      });
      const removeBtn = row.createEl('button', { text: '×', cls: 'vd-city-remove' });
      removeBtn.addEventListener('click', () => {
        cities.splice(i, 1);
        this.renderCities(container);
        void this.plugin.saveSettings();
      });
    });
  }
}
