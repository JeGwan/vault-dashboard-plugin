import { Component, MarkdownRenderer, TFile } from 'obsidian';
import type { DashboardWidget, WidgetContext } from './base';

// Inline kanban parser
const HEADING_RE = /^## (.+)$/;
const CARD_RE = /^- \[([ x])\] (.*)$/;
const DUE_RE = /@\{(\d{4}-\d{2}-\d{2})\}/;
const LIFECYCLE_RE = /\u23f1\{([^}]+)\}/;
const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;

interface KanbanCard {
  title: string;
  checked: boolean;
  body: string[];
  dueDate: string | null;
}

interface KanbanColumn {
  name: string;
  type: string;
  wip?: number;
  cards: KanbanCard[];
}

function parseKanbanBoard(content: string): KanbanColumn[] | null {
  const fm = content.match(FRONTMATTER_RE);
  const isKanban = fm && /gongmyung-kanban:\s*board/.test(fm[1]);
  if (!isKanban) return null;

  const colDefs: { name: string; type: string; wip?: number }[] = [];
  if (fm) {
    const colMatches = fm[1].matchAll(/\{\s*name:\s*"([^"]+)"\s*,\s*type:\s*(\w+)(?:\s*,\s*wip:\s*(\d+))?\s*\}/g);
    for (const m of colMatches) {
      colDefs.push({ name: m[1], type: m[2], wip: m[3] ? parseInt(m[3], 10) : undefined });
    }
  }

  const afterFm = content.replace(FRONTMATTER_RE, '').replace(/^\n+/, '');
  const lines = afterFm.split('\n');
  const columns: KanbanColumn[] = [];
  let currentCol: KanbanColumn | null = null;

  for (const line of lines) {
    const hm = line.match(HEADING_RE);
    if (hm) {
      if (hm[1].toLowerCase() === 'archive') break;
      const defMatch = colDefs.find(c => hm[1].includes(c.name) || c.name.includes(hm[1]));
      currentCol = { name: hm[1], type: defMatch?.type || 'inbox', wip: defMatch?.wip, cards: [] };
      columns.push(currentCol);
      continue;
    }
    if (!currentCol) continue;
    const cm = line.match(CARD_RE);
    if (cm) {
      currentCol.cards.push({ title: cm[2], checked: cm[1] === 'x', body: [], dueDate: null });
    } else if (currentCol.cards.length > 0) {
      const card = currentCol.cards[currentCol.cards.length - 1];
      const duem = line.match(DUE_RE);
      if (duem) card.dueDate = duem[1];
      if (!LIFECYCLE_RE.test(line) && line.trim()) {
        card.body.push(line);
      }
    }
  }
  return columns;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export class NoteWidget implements DashboardWidget {
  id: string;
  name: string;
  notePath: string;
  el!: HTMLElement;
  ctx!: WidgetContext;

  constructor(id: string, notePath: string) {
    this.id = id;
    this.name = 'Note: ' + (notePath ? notePath.split('/').pop()?.replace('.md', '') : 'Empty');
    this.notePath = notePath || '';
  }

  render(container: HTMLElement, ctx: WidgetContext): void {
    this.ctx = ctx;
    this.el = container.createDiv({ cls: 'vd-card vd-note-widget' });
    if (!this.notePath) {
      this.el.createDiv({ cls: 'vd-note-empty', text: 'Set the note path' });
      return;
    }
    void this.loadNote();
  }

  async loadNote(): Promise<void> {
    if (!this.el || !this.ctx) return;
    this.el.empty();
    const fileName = this.notePath.split('/').pop()?.replace('.md', '') || '';
    const header = this.el.createDiv({ cls: 'vd-note-header' });
    header.createSpan({ cls: 'vd-note-title', text: fileName });
    const openBtn = header.createEl('button', { cls: 'vd-note-open-btn', text: '\u2197' });
    openBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const file = this.ctx.app.vault.getAbstractFileByPath(this.notePath);
      if (file) void this.ctx.app.workspace.getLeaf('tab').openFile(file as TFile);
    });
    const body = this.el.createDiv({ cls: 'vd-note-body' });
    try {
      const file = this.ctx.app.vault.getAbstractFileByPath(this.notePath);
      if (!file) {
        body.createDiv({ cls: 'vd-note-empty', text: 'File not found: ' + this.notePath });
        return;
      }
      const content = await this.ctx.app.vault.cachedRead(file as TFile);
      const kanbanCols = parseKanbanBoard(content);
      if (kanbanCols) {
        this.renderKanban(body, kanbanCols);
      } else {
        const md = content.replace(/^---\n[\s\S]*?\n---\n?/, '');
        const comp = new Component();
        comp.load();
        body.empty();
        await MarkdownRenderer.render(this.ctx.app, md, body, this.notePath, comp);
      }
    } catch (err) {
      body.createDiv({ cls: 'vd-note-empty', text: 'Load failed: ' + (err as Error).message });
    }
  }

  renderKanban(body: HTMLElement, columns: KanbanColumn[]): void {
    body.empty();
    body.addClass('vd-kanban-body');
    const board = body.createDiv({ cls: 'vd-kb-board' });
    for (const col of columns) {
      const colEl = board.createDiv({ cls: 'vd-kb-col' });
      const colHeader = colEl.createDiv({ cls: 'vd-kb-col-header' });
      colHeader.createSpan({ cls: 'vd-kb-col-name', text: col.name });
      const count = col.cards.filter(c => !c.checked).length;
      colHeader.createSpan({ cls: 'vd-kb-col-count', text: String(count) });
      if (col.wip && count > col.wip) {
        colHeader.addClass('vd-kb-wip-over');
      }
      const cardList = colEl.createDiv({ cls: 'vd-kb-cards' });
      for (const card of col.cards) {
        const cardEl = cardList.createDiv({ cls: 'vd-kb-card' + (card.checked ? ' vd-kb-card-done' : '') });
        cardEl.createDiv({ cls: 'vd-kb-card-title', text: card.title });
        if (card.dueDate) {
          const days = daysUntil(card.dueDate);
          const dueEl = cardEl.createDiv({ cls: 'vd-kb-card-due' });
          if (days < 0) {
            dueEl.textContent = 'D+' + Math.abs(days);
            dueEl.addClass('vd-kb-overdue');
          } else if (days === 0) {
            dueEl.textContent = 'Today';
            dueEl.addClass('vd-kb-today');
          } else {
            dueEl.textContent = 'D-' + days;
            if (days <= 3) dueEl.addClass('vd-kb-soon');
          }
        }
      }
    }
  }

  async refresh(ctx: WidgetContext): Promise<void> {
    this.ctx = ctx;
    if (this.notePath) await this.loadNote();
  }

  destroy(): void { /* noop */ }
}
