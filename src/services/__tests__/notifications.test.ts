import { describe, it, expect, beforeEach } from 'vitest'
import { NotificationService } from '../notifications'

const mockNotify = (globalThis as any).mockNotify

describe('NotificationService', () => {
  let notif: NotificationService

  beforeEach(() => {
    mockNotify.init.mockClear()
    mockNotify.Notification.new.mockClear()
    notif = new NotificationService()
  })

  it('constructor initializes Notify', () => {
    expect(mockNotify.init).toHaveBeenCalledWith('Plundernome')
  })

  it('show creates and shows notification', () => {
    notif.show('Title', 'Body', 'critical')
    expect(mockNotify.Notification.new).toHaveBeenCalledWith('Title', 'Body', 'dialog-information')
    const n = mockNotify.Notification.new.mock.results[0]!.value
    expect(n.set_urgency).toHaveBeenCalledWith('critical')
    expect(n.show).toHaveBeenCalled()
  })

  it('show defaults to normal urgency', () => {
    notif.show('Title', 'Body')
    const n = mockNotify.Notification.new.mock.results[0]!.value
    expect(n.set_urgency).toHaveBeenCalledWith('normal')
  })

  it('showDownloadComplete shows download notification', () => {
    notif.showDownloadComplete('GameName')
    expect(mockNotify.Notification.new).toHaveBeenCalledWith('Download Complete', '✓ GameName has finished downloading', 'dialog-information')
    const n = mockNotify.Notification.new.mock.results[0]!.value
    expect(n.show).toHaveBeenCalled()
  })

  it('showError shows error notification', () => {
    notif.showError('Error Title', 'Error details')
    expect(mockNotify.Notification.new).toHaveBeenCalledWith('Error Title', 'Error details', 'dialog-error')
    const n = mockNotify.Notification.new.mock.results[0]!.value
    expect(n.show).toHaveBeenCalled()
  })
})
