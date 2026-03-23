import type { App } from 'obsidian';
import type { VaultDashboardSettings } from '../settings';

export interface WidgetContext {
  app: App;
  settings: VaultDashboardSettings;
}

export interface DashboardWidget {
  id: string;
  name: string;
  render(container: HTMLElement, ctx: WidgetContext): void;
  refresh?(ctx: WidgetContext): void | Promise<void>;
  destroy?(): void;
}
