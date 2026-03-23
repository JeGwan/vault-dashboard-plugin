export interface WidgetPlacement {
  id: string;
  col: number;    // 0-based column start
  row: number;    // 0-based row start
  colSpan: number; // how many columns
  rowSpan: number; // how many rows
}

export interface VaultDashboardSettings {
  cities: string[];
  youtubeId: string;
  widgets: {
    flipClock: boolean;
    weather: boolean;
    quote: boolean;
    photo: boolean;
    heatmap: boolean;
    calendar: boolean;
    youtube: boolean;
  };
  layout: WidgetPlacement[];
  gridCols: number; // default 4
  noteWidgets: { id: string; path: string }[];
}

export const DEFAULT_LAYOUT: WidgetPlacement[] = [
  { id: 'flip-clock',      col: 0, row: 0, colSpan: 2, rowSpan: 1 },
  { id: 'weather',         col: 2, row: 0, colSpan: 1, rowSpan: 1 },
  { id: 'daily-quote',     col: 3, row: 0, colSpan: 1, rowSpan: 1 },
  { id: 'random-photo',    col: 0, row: 1, colSpan: 2, rowSpan: 1 },
  { id: 'youtube-player',  col: 2, row: 1, colSpan: 2, rowSpan: 1 },
  { id: 'calendar',        col: 0, row: 2, colSpan: 2, rowSpan: 2 },
  { id: 'activity-heatmap',col: 2, row: 2, colSpan: 2, rowSpan: 1 },
];

export const WIDGET_MIN_SIZE: Record<string, { minCol: number; minRow: number }> = {
  'flip-clock':       { minCol: 1, minRow: 1 },
  'weather':          { minCol: 1, minRow: 1 },
  'daily-quote':      { minCol: 1, minRow: 1 },
  'random-photo':     { minCol: 1, minRow: 1 },
  'youtube-player':   { minCol: 2, minRow: 1 },
  'calendar':         { minCol: 1, minRow: 1 },
  'activity-heatmap': { minCol: 2, minRow: 1 },
  'note':             { minCol: 1, minRow: 1 },
};

export const DEFAULT_SETTINGS: VaultDashboardSettings = {
  cities: ['인천(송도)', '발리'],
  youtubeId: 'jfKfPfyJRdk',
  widgets: {
    flipClock: true,
    weather: true,
    quote: true,
    photo: true,
    heatmap: true,
    calendar: true,
    youtube: true,
  },
  layout: DEFAULT_LAYOUT,
  gridCols: 4,
  noteWidgets: [],
};
