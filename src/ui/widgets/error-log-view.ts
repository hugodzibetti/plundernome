import { createButton } from '../factory'
import { _t } from '../../domain/i18n'
import type { LogEntry, LogFilter } from '../../services/database/database-types'

const { Gtk, Adw, Gdk } = imports.gi

const STATUS_OPTIONS = ['', 'started', 'completed', 'failed', 'skipped'] as const
const STATUS_LABELS = ['All', 'Started', 'Completed', 'Failed', 'Skipped'] as const

function trunc(s: string | null, m: number): string {
  if (!s) return ''
  return s.length > m ? s.slice(0, m) + '…' : s
}

function statusBadge(status: string): string {
  if (status === 'completed') return 'status-success'
  if (status === 'failed') return 'status-failed'
  return 'status-skipped'
}

function formatLatency(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

export class ErrorLogView {
  readonly group: AdwPreferencesGroup
  private listBox: GtkListBox
  private gameCombo: AdwComboRow
  private statusCombo: AdwComboRow
  private entries: LogEntry[] = []
  private refreshHandler: ((filter: LogFilter) => void) | null = null
  private gameIds: string[] = []

  constructor() {
    this.group = new Adw.PreferencesGroup({ title: _t('settings.error-log') })
    this.group.add_css_class('error-log-group')

    this.gameCombo = new Adw.ComboRow({
      title: _t('settings.error-log.game'),
      model: new Gtk.StringList({ strings: [_t('settings.error-log.all-games')] }),
      selected: 0,
    })
    this.gameCombo.connect('notify::selected', () => this.triggerRefresh())
    this.group.add(this.gameCombo)

    this.statusCombo = new Adw.ComboRow({
      title: _t('settings.error-log.status'),
      model: new Gtk.StringList({ strings: [...STATUS_LABELS] }),
      selected: 0,
    })
    this.statusCombo.connect('notify::selected', () => this.triggerRefresh())
    this.group.add(this.statusCombo)

    const refreshBtn = createButton({
      label: _t('common.refresh'),
      onClick: () => this.triggerRefresh(),
    })
    const refreshRow = new Adw.ActionRow({ title: '' })
    refreshRow.add_suffix(refreshBtn)
    refreshRow.set_activatable_widget(refreshBtn)
    this.group.add(refreshRow)

    const listBoxWrap = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6 })
    this.listBox = new Gtk.ListBox({ css_classes: ['boxed-list'] })
    listBoxWrap.append(this.listBox)
    this.group.add(listBoxWrap)

    const copyBtn = createButton({
      label: _t('settings.error-log.copy-all'),
      onClick: () => this.copyAsCSV(),
    })
    const copyRow = new Adw.ActionRow({ title: '' })
    copyRow.add_suffix(copyBtn)
    copyRow.set_activatable_widget(copyBtn)
    this.group.add(copyRow)
  }

  setGameIds(ids: string[]): void {
    this.gameIds = ids
    const allLabel = _t('settings.error-log.all-games')
    this.gameCombo.set_model(new Gtk.StringList({ strings: [allLabel, ...ids] }))
  }

  setLogEntries(entries: LogEntry[]): void {
    this.entries = entries
    let child = this.listBox.get_first_child() as GtkWidget | null
    while (child) {
      const next = child.get_next_sibling() as GtkWidget | null
      this.listBox.remove(child)
      child = next
    }
    for (const entry of entries) {
      this.listBox.append(this.buildRow(entry))
    }
  }

  onRefreshLogs(cb: (filter: LogFilter) => void): void {
    this.refreshHandler = cb
  }

  refreshLogs(): void {
    this.triggerRefresh()
  }

  private triggerRefresh(): void {
    const filter: LogFilter = {}
    const gi = this.gameCombo.get_selected()
    if (gi > 0) filter.gameId = this.gameIds[gi - 1]
    const si = this.statusCombo.get_selected()
    if (si > 0) filter.status = STATUS_OPTIONS[si]
    this.refreshHandler?.(filter)
  }

  private buildRow(e: LogEntry): AdwActionRow {
    const row = new Adw.ActionRow({
      title: `${e.game_id} — ${e.step}`,
      subtitle: `${e.created_at} — ${trunc(e.message, 60)}`,
    })
    row.add_css_class('error-log-row')
    const badge = new Gtk.Label({
      label: e.status,
      css_classes: ['caption', statusBadge(e.status)],
      valign: Gtk.Align.CENTER,
    })
    row.add_suffix(badge)
    if (e.message) {
      const copyBtn = createButton({
        iconName: 'edit-copy-symbolic',
        tooltip: _t('common.copy'),
        onClick: () => {
          const display = Gdk.Display.get_default()
          display?.get_clipboard()?.set_text(e.message!)
        },
      })
      row.add_suffix(copyBtn)
    }
    return row
  }

  private copyAsCSV(): void {
    const header = 'game_id,step,status,message,created_at'
    const rows = this.entries.map(e => {
      const msg = (e.message ?? '').replace(/"/g, '""')
      return `${e.game_id},${e.step},${e.status},"${msg}",${e.created_at}`
    })
    const csv = [header, ...rows].join('\n')
    const display = Gdk.Display.get_default()
    display?.get_clipboard()?.set_text(csv)
  }
}
