const { Gtk } = imports.gi
import { ensureCached } from '../../services/cover-cache'

const COVER_W = 200
const COVER_H = 128

export interface GameCardCoverWidget {
  widget: GtkStack
  loadImmediate(path: string): void
  loadAsync(gameId: string, imageUrl: string): void
}

export function createGameCardCover(): GameCardCoverWidget {
  const stack = new Gtk.Stack()
  stack.set_size_request(COVER_W, COVER_H)
  stack.set_vexpand(false)
  stack.set_transition_type(Gtk.StackTransitionType.CROSSFADE)
  stack.set_transition_duration(300)

  const skeleton = new Gtk.Box()
  skeleton.set_size_request(COVER_W, COVER_H)
  skeleton.add_css_class('cover-skeleton')
  stack.add_named(skeleton, 'skeleton')

  const picProps: Record<string, unknown> = { content_fit: Gtk.ContentFit.COVER }
  const picture = new Gtk.Picture(picProps)
  picture.set_size_request(COVER_W, COVER_H)
  picture.add_css_class('card-cover')
  stack.add_named(picture, 'cover')

  const fallback = new Gtk.Image({ icon_name: 'application-x-executable', pixel_size: 128 })
  fallback.set_size_request(COVER_W, COVER_H)
  fallback.add_css_class('card-cover')
  stack.add_named(fallback, 'fallback')

  stack.set_visible_child(skeleton)

  let destroyed = false
  stack.connect('destroy', () => { destroyed = true })

  function loadImmediate(path: string): void {
    if (destroyed) return
    picture.set_filename(path)
    picture.add_css_class('cover-loaded')
    stack.set_visible_child(picture)
  }

  async function loadAsync(gameId: string, imageUrl: string): Promise<void> {
    if (destroyed || !imageUrl) return
    const path = await ensureCached(gameId, imageUrl)
    if (destroyed) return
    if (path) {
      picture.set_filename(path)
      picture.add_css_class('cover-loaded')
      stack.set_visible_child(picture)
    } else {
      stack.set_visible_child(fallback)
    }
  }

  return { widget: stack, loadImmediate, loadAsync }
}
