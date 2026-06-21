import type { INotificationService } from './types'

export class NotificationService implements INotificationService {
  private _notify: typeof imports.gi.Notify | null = null
  private actionHandlers = new Map<string, () => void>()
  private currentNotification: NotifyNotification | null = null

  constructor() {
    try {
      this._notify = imports.gi.Notify
      this._notify.init('Plundernome')
    } catch {
      this._notify = null
    }
  }

  private get available(): boolean {
    return this._notify !== null
  }

  show(title: string, body: string, urgency: 'low' | 'normal' | 'critical' = 'normal'): void {
    if (!this._notify) return
    const notif = this._notify.Notification.new(title, body, 'dialog-information')
    notif.set_urgency(urgency)
    notif.show()
  }

  addAction(label: string, callback: () => void): void {
    if (!this.currentNotification) return
    const actionId = `action_${this.actionHandlers.size}`
    this.actionHandlers.set(actionId, callback)
    this.currentNotification.add_action(actionId, label)
  }

  showDownloadCompleteWithActions(
    gameId: string,
    gameName: string,
    actions: { label: string; callback: () => void }[],
  ): void {
    if (!this._notify) return
    const notif = this._notify.Notification.new(
      'Download Complete',
      `✓ ${gameName} has finished downloading`,
      'dialog-information',
    )
    this.actionHandlers.clear()
    this.currentNotification = notif
    for (const a of actions) {
      const actionId = `action_${this.actionHandlers.size}`
      this.actionHandlers.set(actionId, a.callback)
      notif.add_action(actionId, a.label)
    }
    notif.connect('action-invoked', (_n: unknown, ...args: unknown[]) => {
      const action = args[0] as string | undefined
      if (!action) return
      const handler = this.actionHandlers.get(action)
      handler?.()
    })
    notif.show()
  }

  showDownloadComplete(gameName: string, onLaunch?: () => void, onShow?: () => void): void {
    if (!this._notify) return
    const notif = this._notify.Notification.new(
      'Download Complete',
      `✓ ${gameName} has finished downloading`,
      'dialog-information',
    )
    this.actionHandlers.clear()
    const hasAction = onLaunch !== undefined || onShow !== undefined
    if (onLaunch) {
      notif.add_action('launch', 'Launch Now')
      this.actionHandlers.set('launch', onLaunch)
    }
    if (onShow) {
      notif.add_action('show', 'Show in App')
      this.actionHandlers.set('show', onShow)
    }
    if (hasAction) {
      notif.connect('action-invoked', (_n: unknown, ...args: unknown[]) => {
        const action = args[0] as string | undefined
        if (!action) return
        const handler = this.actionHandlers.get(action)
        handler?.()
      })
    }
    notif.show()
  }

  showError(title: string, message: string): void {
    if (!this._notify) return
    const notif = this._notify.Notification.new(title, message, 'dialog-error')
    notif.show()
  }
}
