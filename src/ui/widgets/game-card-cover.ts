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
  stack.set_vexpand(false)
  stack.add_css_class('sizing-cover')
  stack.set_transition_type(Gtk.StackTransitionType.CROSSFADE)
  stack.set_transition_duration(300)

  const skeleton = new Gtk.Box()
  skeleton.add_css_class('cover-skeleton')
  skeleton.add_css_class('sizing-cover')
  stack.add_named(skeleton, 'skeleton')

  const picProps: Record<string, unknown> = { content_fit: Gtk.ContentFit.COVER }
  const picture = new Gtk.Picture(picProps)
  picture.add_css_class('card-cover')
  picture.add_css_class('sizing-cover-pic')
  stack.add_named(picture, 'cover')

  const fallback = new Gtk.Image({ icon_name: 'application-x-executable', pixel_size: 128 })
  fallback.add_css_class('card-cover')
  fallback.add_css_class('sizing-cover')
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
