import type { DashboardWidget, WidgetContext } from './base';
import { CITY_PRESETS } from '../data/city-presets';
import { WMO } from '../data/weather-codes';

interface WeatherData {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
}

const cache: Record<string, { data: WeatherData; ts: number }> = {};

export class WeatherWidget implements DashboardWidget {
  id = 'weather';
  name = 'Weather';
  private el!: HTMLElement;
  private tabsEl!: HTMLElement;
  private bodyEl!: HTMLElement;
  private activeCity: string | null = null;

  render(container: HTMLElement, ctx: WidgetContext): void {
    this.el = container.createDiv({ cls: 'vd-card vd-weather' });
    this.tabsEl = this.el.createDiv({ cls: 'vd-weather-tabs' });
    this.bodyEl = this.el.createDiv({ cls: 'vd-weather-body' });
    this.buildTabs(ctx);
  }

  async refresh(ctx: WidgetContext): Promise<void> {
    this.buildTabs(ctx);
  }

  private buildTabs(ctx: WidgetContext): void {
    this.tabsEl.empty();
    const cities = ctx.settings.cities.length > 0 ? ctx.settings.cities : ['인천(송도)', '발리'];
    cities.forEach((city, i) => {
      const btn = this.tabsEl.createEl('button', { cls: 'vd-weather-tab', text: city });
      if (i === 0) btn.addClass('active');
      btn.dataset.city = city;
      btn.addEventListener('click', () => this.showCity(city));
    });
    if (cities.length > 0) this.showCity(cities[0]);
  }

  private async showCity(city: string): Promise<void> {
    this.activeCity = city;
    this.tabsEl.querySelectorAll('.vd-weather-tab').forEach(t =>
      t.classList.toggle('active', (t as HTMLElement).dataset.city === city)
    );
    this.bodyEl.empty();
    this.bodyEl.createDiv({ cls: 'vd-weather-loading', text: 'Loading...' });

    try {
      const data = await this.fetchWeather(city);
      if (this.activeCity !== city) return;
      if (!data) {
        this.bodyEl.empty();
        this.bodyEl.createDiv({ cls: 'vd-weather-desc', text: '도시 좌표를 찾을 수 없습니다' });
        return;
      }
      this.renderWeather(data);
    } catch {
      if (this.activeCity === city) {
        this.bodyEl.empty();
        this.bodyEl.createDiv({ cls: 'vd-weather-desc', text: '날씨 로드 실패' });
      }
    }
  }

  private async fetchWeather(city: string): Promise<WeatherData | null> {
    const cached = cache[city];
    if (cached && Date.now() - cached.ts < 600000) return cached.data;

    const coords = CITY_PRESETS[city];
    if (!coords) return null;

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();
    cache[city] = { data, ts: Date.now() };
    return data;
  }

  private renderWeather(data: WeatherData): void {
    this.bodyEl.empty();
    const c = data.current;
    const wmo = WMO[c.weather_code] || ['🌡️', `코드 ${c.weather_code}`];

    const main = this.bodyEl.createDiv({ cls: 'vd-weather-main' });
    main.createSpan({ cls: 'vd-weather-icon', text: wmo[0] });
    main.createSpan({ cls: 'vd-weather-temp', text: `${Math.round(c.temperature_2m)}°` });

    this.bodyEl.createDiv({ cls: 'vd-weather-desc', text: wmo[1] });

    const detail = this.bodyEl.createDiv({ cls: 'vd-weather-detail' });
    detail.createSpan({ text: `💨 ${c.wind_speed_10m} km/h` });
    detail.createSpan({ text: `💧 ${c.relative_humidity_2m}%` });
  }

  destroy(): void {}
}
