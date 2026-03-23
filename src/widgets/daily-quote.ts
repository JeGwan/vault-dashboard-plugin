import type { DashboardWidget, WidgetContext } from './base';
import { QUOTES, type Quote } from '../data/quotes';

const thumbCache: Record<string, string | null> = {};
const SKIP_AUTHORS = ['anonymous', 'african proverb', 'chinese proverb', "leblanc's law"];

function todayIndex(): number {
  const d = new Date();
  const seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  return seed % (QUOTES.length || 1);
}

function randomIndex(exclude: number): number {
  if (QUOTES.length <= 1) return 0;
  let idx: number;
  do { idx = Math.floor(Math.random() * QUOTES.length); } while (idx === exclude);
  return idx;
}

async function fetchThumb(author: string): Promise<string | null> {
  if (!author || SKIP_AUTHORS.includes(author.toLowerCase())) return null;
  if (thumbCache[author] !== undefined) return thumbCache[author];

  try {
    const name = encodeURIComponent(author.replace(/ /g, '_'));
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${name}`);
    if (!res.ok) { thumbCache[author] = null; return null; }
    const data = await res.json();
    const url = data.thumbnail?.source || null;
    thumbCache[author] = url;
    return url;
  } catch {
    thumbCache[author] = null;
    return null;
  }
}

export class DailyQuoteWidget implements DashboardWidget {
  id = 'daily-quote';
  name = 'Daily Quote';
  private el!: HTMLElement;
  private bodyEl!: HTMLElement;
  private metaEl!: HTMLElement;
  private currentIdx = 0;

  render(container: HTMLElement): void {
    this.el = container.createDiv({ cls: 'vd-card vd-quote' });
    this.bodyEl = this.el.createDiv({ cls: 'vd-quote-body' });
    this.metaEl = this.el.createDiv({ cls: 'vd-quote-meta' });

    this.currentIdx = todayIndex();
    this.showQuote(QUOTES[this.currentIdx], null);
    fetchThumb(QUOTES[this.currentIdx].author).then(thumb => {
      if (thumb) this.showQuote(QUOTES[this.currentIdx], thumb);
    });
  }

  private showQuote(q: Quote, thumbUrl: string | null): void {
    this.bodyEl.empty();
    this.bodyEl.createSpan({ cls: 'vd-quote-ko', text: q.ko });
    this.bodyEl.createSpan({ cls: 'vd-quote-en', text: q.en });

    this.metaEl.empty();
    const authorRow = this.metaEl.createDiv({ cls: 'vd-quote-author-row' });

    if (thumbUrl) {
      authorRow.createEl('img', { cls: 'vd-quote-thumb', attr: { src: thumbUrl, alt: q.author } });
    }

    const hasWiki = !SKIP_AUTHORS.includes(q.author.toLowerCase());
    const dash = thumbUrl ? '' : '— ';
    if (hasWiki) {
      const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(q.author.replace(/ /g, '_'))}`;
      authorRow.createEl('a', { cls: 'vd-quote-author', text: `${dash}${q.author}`, href: wikiUrl });
    } else {
      authorRow.createSpan({ cls: 'vd-quote-author', text: `${dash}${q.author}` });
    }

    const refreshBtn = this.metaEl.createEl('button', { cls: 'vd-quote-refresh', text: '↻' });
    refreshBtn.title = '다른 명언';
    refreshBtn.addEventListener('click', async () => {
      this.currentIdx = randomIndex(this.currentIdx);
      const nextQ = QUOTES[this.currentIdx];
      this.showQuote(nextQ, null);
      const thumb = await fetchThumb(nextQ.author);
      if (thumb) this.showQuote(nextQ, thumb);
    });
  }

  destroy(): void {}
}
