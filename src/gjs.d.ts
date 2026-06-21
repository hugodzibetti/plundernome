// Gtk widget base
declare class GtkWidget {
  add_css_class(cls: string): void
  remove_css_class(cls: string): void
  set_child(child: unknown): void
  get_child(): unknown
  set_hexpand(expand: boolean): void
  set_vexpand(expand: boolean): void
  set_size_request(width: number, height: number): void
  set_halign(align: number): void
  set_valign(align: number): void
  set_sensitive(sensitive: boolean): void
  set_focusable(focusable: boolean): void
  set_margin_start(margin: number): void
  set_margin_end(margin: number): void
  set_margin_top(margin: number): void
  set_margin_bottom(margin: number): void
  add_controller(controller: unknown): void
  get_native(): unknown
  get_root(): unknown
  get_display(): unknown
  connect(signal: string, callback: (...args: any[]) => void): number
  emit(signal: string, ...args: unknown[]): void
  get_data(key: string): unknown
  set_data(key: string, value: unknown): void
  is_symlink(): boolean
  set_visible(visible: boolean): void
  get_first_child(): unknown
  get_next_sibling(): unknown
  present(): void
  close(): void
  show(): void
  hide(): void
  grab_focus(): void
  get_parent(): unknown
  set_parent(parent: unknown): void
  notify(name: string): void
  get_name(): string
  set_opacity(opacity: number): void
}

declare class GtkContainer extends GtkWidget {
  append(child: unknown): void
  remove(child: unknown): unknown
}

declare class GtkBox extends GtkContainer {
  set_homogeneous(h: boolean): void
  set_spacing(spacing: number): void
}

declare class GtkSearchBar extends GtkWidget {
  set_child(child: unknown): void
  set_search_mode(mode: boolean): void
  get_search_mode(): boolean
  set_key_capture_widget(widget: unknown): void
}

declare class GtkSearchEntry extends GtkWidget {
  get_text(): string
  set_text(text: string): void
  set_placeholder_text(text: string): void
  grab_focus(): void
}

declare class GtkStack extends GtkContainer {
  add_named(child: unknown, name: string): void
  add_child(child: unknown): void
  set_visible_child_name(name: string): void
  set_visible_child(child: unknown): void
  get_child_by_name(name: string): unknown
  set_transition_type(transition: number): void
  set_transition_duration(duration: number): void
  set_vexpand(v: boolean): void
  set_hexpand(v: boolean): void
}

declare class GtkOverlay extends GtkContainer {
  add_overlay(child: unknown): void
  remove_overlay(child: unknown): void
}

declare class GtkFlowBox extends GtkContainer {
  set_max_children_per_line(n: number): void
  set_min_children_per_line(n: number): void
  set_homogeneous(h: boolean): void
  set_selection_mode(mode: number): void
  get_child_at_index(idx: number): unknown
}

declare class GtkViewport extends GtkWidget {
  set_child(child: unknown): void
}

declare class GtkListBox extends GtkContainer {
  set_selection_mode(mode: number): void
  get_row_at_index(idx: number): unknown
  get_selected_row(): unknown
  get_first_child(): unknown
  remove(child: unknown): unknown
  append(child: unknown): void
  get_last_child(): unknown
  select_row(row: unknown): void
}

declare class GtkListBoxRow extends GtkWidget {
  set_child(child: unknown): void
  get_index(): number
}

declare class GtkButton extends GtkWidget {
  set_label(label: string): void
  set_tooltip_text(text: string): void
}

declare class GtkToggleButton extends GtkButton {
  set_group(button: unknown): void
  set_active(active: boolean): void
  get_active(): boolean
}

declare class GtkCheckButton extends GtkToggleButton {
}

declare class GtkLabel extends GtkWidget {
  set_label(label: string): void
  set_text(text: string): void
  set_ellipsize(mode: number): void
  set_xalign(x: number): void
  get_text(): string
}

declare class GtkImage extends GtkWidget {
  set_icon_name(name: string): void
  set_pixel_size(size: number): void
}

declare class GtkPicture extends GtkWidget {
  set_filename(path: string): void
  set_content_fit(fit: number): void
}

declare class GtkCssProvider {
  load_from_file(file: unknown): void
}

declare class GtkSwitch extends GtkWidget {
  set_active(active: boolean): void
  get_active(): boolean
}

declare class GtkSpinButton extends GtkWidget {
  get_value(): number
  get_value_as_int(): number
  set_value(val: number): void
  get_text(): string
  set_placeholder_text(text: string): void
}

declare class GtkAdjustment {
  get_value(): number
  set_value(val: number): void
  get_upper(): number
  set_upper(val: number): void
  get_page_size(): number
  set_page_size(val: number): void
  get_lower(): number
  set_lower(val: number): void
  connect(signal: string, callback: (...args: any[]) => void): number
  disconnect(id: number): void
}

declare class GtkDropDown extends GtkWidget {
  set_model(model: unknown): void
  get_selected(): number
  set_selected(n: number): void
}

declare class GtkStringList {
  constructor(props?: Record<string, unknown>)
}

declare class GtkScrolledWindow extends GtkWidget {
  set_child(child: unknown): void
  get_vadjustment(): GtkAdjustment
}

declare class GtkTextBuffer {
  set_text(text: string): void
  get_text(start: unknown, end: unknown, include_hidden_chars: boolean): string
  get_start_iter(): unknown
  get_end_iter(): unknown
}

declare class GtkTextView extends GtkWidget {
  set_buffer(buffer: unknown): void
  set_monospace(v: boolean): void
}

declare class GtkGestureClick extends GtkWidget {
  set_button(button: number): void
  connect(signal: string, cb: (...args: any[]) => void): number
}

declare class GtkPopoverMenu extends GtkWidget {
  set_child(child: unknown): void
  set_parent(parent: unknown): void
  popup(): void
  popdown(): void
  set_pointing_to(rect: { x: number; y: number; width: number; height: number }): void
}

declare class GtkShortcutController extends GtkWidget {
  add_shortcut(shortcut: unknown): void
  set_scope(scope: number): void
}

declare class GtkShortcut {
  constructor(props?: Record<string, unknown>)
}

declare class GtkShortcutTrigger {
  static parse_string(str: string): unknown
}

declare class GtkCallbackAction {
  constructor(cb: () => boolean)
  static new(cb: () => boolean): GtkCallbackAction
}

declare class GtkProgressBar extends GtkWidget {
  set_fraction(fraction: number): void
}

declare class GtkSpinner extends GtkWidget {
  start(): void
  stop(): void
}

declare class GtkEntry extends GtkWidget {
  set_text(text: string): void
  get_text(): string
  set_placeholder_text(text: string): void
  set_hexpand(v: boolean): void
}

declare class GtkExpander extends GtkWidget {
  constructor(props?: Record<string, unknown>)
  set_label(label: string): void
  set_expanded(expanded: boolean): void
  set_child(child: unknown): void
}

declare class GtkFileChooserNative extends GtkWidget {
  constructor(props?: Record<string, unknown>)
  show(): void
  present(): void
  get_file(): GioFile | null
  destroy(): void
  connect(signal: string, cb: (...args: any[]) => void): number
}

// Adw
declare class AdwWidget extends GtkWidget {
}

declare class AdwBin extends AdwWidget {
}

declare class AdwApplication extends GtkWidget {
  run(args: string[]): void
}

declare class AdwApplicationWindow extends AdwBin {
  set_content(content: unknown): void
  present(): void
  set_default_size(width: number, height: number): void
}

declare class AdwHeaderBar {
  set_title_widget(widget: unknown): void
  pack_start(child: unknown): void
  pack_end(child: unknown): void
  remove(child: unknown): void
  static new(): AdwHeaderBar
}

declare class AdwWindowTitle {
  constructor(props?: Record<string, unknown>)
}

declare class AdwNavigationPage extends AdwWidget {
  set_title(title: string): void
}

declare class AdwNavigationSplitView extends AdwWidget {
  set_sidebar(sidebar: unknown): void
  set_content(content: unknown): void
}

declare class AdwToastOverlay extends AdwWidget {
  set_child(child: unknown): void
  add_toast(toast: unknown): void
}

declare class AdwToast {
  constructor(props?: Record<string, unknown>)
  set_timeout(timeout: number): void
  set_button_label(label: string): void
  dismiss(): void
  connect(signal: string, callback: (...args: unknown[]) => void): number
  disconnect(id: number): void
}

declare class AdwClampScrollable extends AdwWidget {
  set_child(child: unknown): void
  set_vexpand(v: boolean): void
  set_maximum_size(size: number): void
  get_vadjustment(): GtkAdjustment
}

declare class AdwPreferencesPage extends AdwWidget {
  add(group: unknown): void
}

declare class AdwPreferencesGroup extends AdwWidget {
  add(widget: unknown): void
}

declare class AdwActionRow extends AdwWidget {
  set_title(title: string): void
  set_subtitle(subtitle: string): void
  add_suffix(widget: unknown): void
  add_prefix(widget: unknown): void
  set_activatable_widget(widget: unknown): void
  remove_suffix(widget: unknown): void
}

declare class AdwComboRow extends AdwActionRow {
  set_model(model: unknown): void
  get_selected(): number
}

declare class AdwStatusPage extends AdwWidget {
  set_title(title: string): void
  set_description(desc: string): void
}

declare class AdwMessageDialog extends AdwWidget {
  constructor(props?: Record<string, unknown>)
  add_response(id: string, label: string): void
  set_response_appearance(id: string, appearance: number): void
  set_extra_child(child: unknown): void
  present(): void
  destroy(): void
}

declare class AdwAlertDialog extends AdwWidget {
  constructor(props?: Record<string, unknown>)
  add_response(id: string, label: string): void
  set_default_response(id: string): void
  present(parent: GtkWidget): void
}

declare class AdwToolbarView extends AdwWidget {
  set_content(content: unknown): void
  add_top_bar(bar: unknown): void
}

declare class AdwShortcutsWindow extends AdwWidget {
  add(child: unknown): void
  present(): void
}

declare class AdwShortcutsSection extends AdwWidget {
  add_shortcut(shortcut: unknown): void
}

declare class AdwShortcutsShortcut {
  constructor(props?: Record<string, unknown>)
}

declare class AdwStyleManager {
  static get_default(): AdwStyleManager
  set_color_scheme(scheme: number): void
}

declare class AdwWindow extends AdwBin {
  set_content(content: unknown): void
}

// GLib
interface GLibStat {
  st_mode: number
  st_size: number
}

declare class GLibChecksum {
  constructor(type: number)
  update(data: Uint8Array | ArrayBuffer): void
  get_string(): string
}

// Gio
interface GioFileInfo {
  get_size(): number
  get_file_type(): number
  get_name(): string
  is_symlink(): boolean
  get_attribute_uint64(attribute: string): number
}

interface GioFile {
  get_path(): string
  query_exists(cancellable: unknown): boolean
  query_info(attributes: string, flags: number, cancellable: unknown): GioFileInfo
  query_filesystem_info(attributes: string, cancellable: unknown): GioFileInfo | null
  replace(etag: string | null, make_backup: boolean, flags: number, cancellable: unknown): GioFileOutputStream
  append_to(flags: number, cancellable: unknown): GioFileOutputStream
  read(cancellable: unknown): GioFileInputStream
  get_parent(): GioFile | null
  make_directory_with_parents(cancellable: unknown): void
  get_child(name: string): GioFile
  delete(cancellable: unknown): void
  make_symbolic_link(target: string, cancellable: unknown): void
  enumerate_children(attributes: string, flags: number, cancellable: unknown): GioFileEnumerator
  get_name(): string
}

interface GioFileOutputStream {
  write(data: unknown, cancellable: unknown): number
  close(cancellable: unknown): void
}

interface GioFileInputStream {
  read_bytes(count: number, cancellable: unknown): GioBytes
  close(cancellable: unknown): void
}

interface GioBytes {
  toArray(): Uint8Array
}

interface GioFileEnumerator {
  next_file(cancellable: unknown): GioFileInfo | null
  close(cancellable: unknown): void
}

interface GioSettings {
  get_string(key: string): string
  set_string(key: string, value: string): void
  get_int(key: string): number
  set_int(key: string, value: number): void
  get_boolean(key: string): boolean
  set_boolean(key: string, value: boolean): void
  bind(key: string, widget: unknown, prop: string, flags: number): void
}

interface GioSettingsSchemaSource {
  lookup(schemaId: string, recursive: boolean): GioSettingsSchema | null
}

interface GioSettingsSchema {
}

declare class GioSubprocess {
  communicate_utf8(stdin: unknown, cancellable: unknown): [boolean, Uint8Array | null, Uint8Array | null]
  get_successful(): boolean
  get_exit_status(): number
  get_identifier(): string | null
  force_exit(): void
  send_signal(signal: number): void
  static new(argv: string[], flags: number): GioSubprocess
}

interface GioCancellable {
  cancel(): void
  is_cancelled(): boolean
}

interface GioDataInputStream {
  read_byte_array(count: number, cancellable: unknown): Uint8Array | null
  close(cancellable: unknown): void
}

// Soup
interface SoupSession {
  send(msg: unknown, cancellable: unknown): number
  user_agent: string
  timeout: number
}

interface SoupMessage {
  request_headers: SoupMessageHeaders
  response_headers: SoupMessageHeaders
  response_body: SoupMessageBody
  request_body: SoupMessageBody
  status_code: number
  set_response(content_type: string, memory_use: number, data: Uint8Array): void
  set_request(content_type: string, memory_use: number, data: Uint8Array): void
  set_status(status_code: number): void
}

interface SoupMessageHeaders {
  append(name: string, value: string): void
  foreach(cb: (name: string, value: string) => void): void
  get_one(name: string): string | null
}

interface SoupMessageBody {
  flatten(): Uint8Array
  read(): Uint8Array
}

interface SoupServer {
  add_handler(path: string, callback: (server: SoupServer, msg: SoupMessage, path: string, query: Record<string, string> | null) => void): void
  listen_local(port: number, options: number): boolean
  disconnect(): void
}

interface GioSocket {
  set_broadcast(enabled: boolean): void
  set_blocking(blocking: boolean): void
  bind(address: GioInetSocketAddress, allowReuse: boolean): void
  get_fd(): number
  send_to(address: GioInetSocketAddress, data: Uint8Array, cancellable: unknown): number
  receive_from(cancellable: unknown): [Uint8Array, GioInetSocketAddress]
  close(): void
}

interface GioInetSocketAddress {
  get_address(): GioInetAddress
}

interface GioInetAddress {
  to_string(): string
}

// Gda
interface GdaConnection {
  close(): void
  execute_select_command(sql: string): GdaDataModel | null
  execute_non_select_command(sql: string): number | null
}

interface GdaDataModel {
  get_n_columns(): number
  get_n_rows(): number
  get_column_name(col: number): string
  get_value_at(col: number, row: number): GdaValue
}

interface GdaValue {
  is_null(): boolean
  get_string(): string
  get_int(): number
  get_double(): number
  get_boolean(): boolean
  to_string(): string
}

// Notify
declare class NotifyNotification {
  constructor(title: string, body: string, icon: string)
  add_action(action: string, label: string): void
  set_urgency(urgency: 'low' | 'normal' | 'critical'): void
  show(): void
  connect(signal: string, callback: (...args: unknown[]) => void): number
  static new(title: string, body: string, icon: string): NotifyNotification
}

// GObject
declare function GObject_registerClass<T>(metadata: Record<string, unknown>, cls: T): T

// Gdk
interface GdkDisplay {
  get_clipboard(): GdkClipboard
}

interface GdkClipboard {
  set_text(text: string): void
}

// GXml (libgxml)
interface GXmlDocument {
  get_document_element(): unknown
  get_elements_by_tag_name(tag: string): GXmlNodeList
}

interface GXmlNodeList {
  next: unknown
  data: unknown
  get_length(): number
  item(index: number): unknown
}

interface GXmlElement {
  get_tag_name(): string
  get_attribute(name: string): string | null
  get_text_content(): string | null
  get_elements_by_tag_name(tag: string): GXmlNodeList
  get_child_elements(): GXmlNodeList
}

declare const imports: {
  byteArray: {
    fromString(str: string): Uint8Array
    toString(bytes: Uint8Array): string
  }
  gi: {
    versions: {
      Gtk: string
      Adw: string
      Soup: string
      Gda: string
    }
    Gtk: {
      Widget: { new(): GtkWidget }
      Box: { new(props?: Record<string, unknown>): GtkBox }
      SearchBar: { new(): GtkSearchBar }
      SearchEntry: { new(props?: Record<string, unknown>): GtkSearchEntry }
      Stack: { new(): GtkStack }
      FlowBox: { new(): GtkFlowBox }
      Viewport: { new(): GtkViewport }
      ListBox: { new(props?: Record<string, unknown>): GtkListBox }
      ListBoxRow: { new(props?: Record<string, unknown>): GtkListBoxRow }
      Button: { new(props?: Record<string, unknown>): GtkButton }
      ToggleButton: { new(props?: Record<string, unknown>): GtkToggleButton }
      CheckButton: { new(props?: Record<string, unknown>): GtkCheckButton }
      Label: { new(props?: Record<string, unknown>): GtkLabel }
      Image: { new(props?: Record<string, unknown>): GtkImage }
      Picture: { new(props?: Record<string, unknown>): GtkPicture }
      CssProvider: { new(): GtkCssProvider }
      Switch: { new(props?: Record<string, unknown>): GtkSwitch }
      SpinButton: { new(props?: Record<string, unknown>): GtkSpinButton }
      Adjustment: { new(props?: Record<string, unknown>): GtkAdjustment }
      StringList: { new(props?: Record<string, unknown>): GtkStringList }
      ScrolledWindow: { new(props?: Record<string, unknown>): GtkScrolledWindow }
      TextBuffer: { new(): GtkTextBuffer }
      TextView: { new(props?: Record<string, unknown>): GtkTextView }
      GestureClick: { new(): GtkGestureClick }
      ShortcutController: { new(): GtkShortcutController }
      Shortcut: { new(props?: Record<string, unknown>): GtkShortcut }
      ProgressBar: { new(props?: Record<string, unknown>): GtkProgressBar }
      Spinner: { new(): GtkSpinner }
      Entry: { new(props?: Record<string, unknown>): GtkEntry }
      FileChooserNative: { new(props?: Record<string, unknown>): GtkFileChooserNative }
      PopoverMenu: { new(): GtkPopoverMenu }
      Overlay: { new(): GtkOverlay }
      DropDown: { new(props?: Record<string, unknown>): GtkDropDown }
      PositionType: { TOP: number; BOTTOM: number; LEFT: number; RIGHT: number }
      Expander: { new(props?: Record<string, unknown>): GtkExpander }
      StyleContext: {
        add_provider_for_display(display: unknown, provider: GtkCssProvider, priority: number): void
      }
      ShortcutTrigger: {
        parse_string(str: string): unknown
      }
      CallbackAction: typeof GtkCallbackAction
      Orientation: {
        VERTICAL: number
        HORIZONTAL: number
      }
      SelectionMode: {
        NONE: number
        SINGLE: number
      }
      StackTransitionType: {
        CROSSFADE: number
        SLIDE_LEFT_RIGHT: number
      }
      PolicyType: {
        NEVER: number
      }
      Align: {
        START: number
        CENTER: number
        END: number
        FILL: number
      }
      ContentFit: {
        COVER: number
      }
      ShortcutScope: {
        GLOBAL: number
      }
      ResponseType: {
        ACCEPT: number
      }
      FileChooserAction: {
        OPEN: number
        SELECT_FOLDER: number
      }
      STYLE_PROVIDER_PRIORITY_APPLICATION: number
      show_uri(display: GdkDisplay | null, uri: string, timestamp: number): void
    }
    Adw: {
      Application: { new(props?: Record<string, unknown>): AdwApplication }
      ApplicationWindow: { new(props?: Record<string, unknown>): AdwApplicationWindow }
      Bin: { new(): AdwBin }
      HeaderBar: { new(): AdwHeaderBar }
      WindowTitle: { new(props?: Record<string, unknown>): AdwWindowTitle }
      NavigationPage: { new(props?: Record<string, unknown>): AdwNavigationPage }
      NavigationSplitView: { new(): AdwNavigationSplitView }
      ToastOverlay: { new(): AdwToastOverlay }
      Toast: { new(props?: Record<string, unknown>): AdwToast }
      ClampScrollable: { new(): AdwClampScrollable }
      PreferencesPage: { new(): AdwPreferencesPage }
      PreferencesGroup: { new(props?: Record<string, unknown>): AdwPreferencesGroup }
      ActionRow: { new(props?: Record<string, unknown>): AdwActionRow }
      ComboRow: { new(props?: Record<string, unknown>): AdwComboRow }
      StatusPage: { new(props?: Record<string, unknown>): AdwStatusPage }
      MessageDialog: { new(props?: Record<string, unknown>): AdwMessageDialog }
      AlertDialog: { new(props?: Record<string, unknown>): AdwAlertDialog }
      ToolbarView: { new(): AdwToolbarView }
      ShortcutsWindow: { new(): AdwShortcutsWindow }
      ShortcutsSection: { new(props?: Record<string, unknown>): AdwShortcutsSection }
      ShortcutsShortcut: { new(props?: Record<string, unknown>): AdwShortcutsShortcut }
      StyleManager: {
        get_default(): AdwStyleManager
      }
      Window: { new(props?: Record<string, unknown>): AdwWindow }
      ToastPriority: {
        HIGH: number
        NORMAL: number
      }
      ResponseAppearance: {
        DESTRUCTIVE: number
        SUGGESTED: number
      }
      ColorScheme: {
        DEFAULT: number
        FORCE_LIGHT: number
        FORCE_DARK: number
      }
      init(): void
    }
    GLib: {
      set_prgname(name: string): void
      set_application_name(name: string): void
      get_prgname(): string
      get_host_name(): string
      get_home_dir(): string
      get_user_cache_dir(): string
      get_current_dir(): string
      get_user_data_dir(): string
      get_tmp_dir(): string
      uuid_string_random(): string
      timeout_add(priority: number, interval: number, callback: () => boolean): number
      source_remove(id: number): void
      usleep(microseconds: number): void
      get_monotonic_time(): number
      spawn_command_line_sync(cmdline: string): [number, Uint8Array | null, Uint8Array | null]
      spawn_command_line_async(cmdline: string): [boolean, number]
      spawn_async(cwd: string | null, argv: string[], envp: string[] | null, flags: number, childSetup: unknown): [boolean, number]
      child_watch_add(pid: number, callback: (pid: number, status: number) => void): number
      child_watch_add(priority: number, pid: number, callback: (pid: number, status: number) => void): number
      file_test(path: string, test: number): boolean
      find_program_in_path(prog: string): string | null
      glob(pattern: string, flags: number): string[]
      mkdir_with_parents(path: string, mode: number): void
      dir_open(path: string, flags: number): unknown
      dir_read_name(dir: unknown): string | null
      dir_close(dir: unknown): void
      stat(path: string): GLibStat
      remove(path: string): void
      compute_checksum_for_string(checksumType: number, str: string, len: number): string
      file_read_link(path: string): string
      file_set_contents(path: string, contents: string): void
      build_filenamev(parts: string[]): string
      Checksum: { new(checksumType: number): GLibChecksum }
      ChecksumType: {
        MD5: number
        SHA256: number
      }
      FileTest: {
        IS_DIR: number
        IS_REGULAR: number
        EXISTS: number
      }
      PRIORITY_DEFAULT: number
      SOURCE_CONTINUE: boolean
      SOURCE_REMOVE: boolean
      IOCondition: { IN: number; OUT: number; PRI: number; ERR: number; HUP: number; NVAL: number }
      io_add_watch(source: GioSocket, priority: number, condition: number, callback: (source: GioSocket, condition: number) => boolean): number
      G_FILE_TEST_EXISTS: number
      G_SPAWN_DEFAULT: number
      G_SPAWN_SEARCH_PATH: number
      G_SPAWN_LEAVE_DESCRIPTORS_OPEN: number
      G_SPAWN_DO_NOT_REAP_CHILD: number
    }
    Gio: {
      File: {
        new_for_path(path: string): GioFile
      }
      FileCreateFlags: {
        NONE: number
      }
      FileQueryInfoFlags: {
        NONE: number
      }
      FileType: {
        REGULAR: number
        DIRECTORY: number
      }
      Settings: { new(options: { schema_id: string }): GioSettings }
      SettingsSchemaSource: {
        get_default(): GioSettingsSchemaSource
      }
      SettingsBindFlags: {
        DEFAULT: number
      }
      Subprocess: typeof GioSubprocess
      SubprocessFlags: {
        STDOUT_PIPE: number
        STDERR_PIPE: number
        STDOUT_SILENCE: number
        STDERR_SILENCE: number
      }
      Cancellable: { new(): GioCancellable }
      DataInputStream: { new(options: { base_stream: GioFileInputStream }): GioDataInputStream }
      ApplicationFlags: {
        DEFAULT_FLAGS: number
      }
      Socket: {
        new(options: { family: number; type: number; protocol: number }): GioSocket
      }
      SocketFamily: {
        IPV4: number
        IPV6: number
      }
      SocketType: {
        DATAGRAM: number
        STREAM: number
      }
      SocketProtocol: {
        UDP: number
        TCP: number
      }
      InetSocketAddress: {
        new(options: { address: GioInetAddress; port: number }): GioInetSocketAddress
      }
      InetAddress: {
        new(options: { from_string: string }): GioInetAddress
        new_from_string(str: string): GioInetAddress
      }
      UnixInputStream: { new(options: { fd: number }): GioFileInputStream }
    }
    GObject: {
      registerClass: typeof GObject_registerClass
      TYPE_STRING: symbol
      TYPE_BOOLEAN: symbol
      TYPE_INT: symbol
      TYPE_DOUBLE: symbol
    }
    Soup: {
      Session: { new(): SoupSession }
      Message: { new(options: { method: string; uri: string }): SoupMessage }
      Server: { new(): SoupServer }
      MemoryUse: { COPY: number; STATIC: number; TEMPORARY: number }
      ServerListenOptions: { IPV4_ONLY: number; IPV6_ONLY: number }
    }
    Gda: {
      Connection: {
        open_from_string(provider: string, connStr: string, options: string | null, cancellable: unknown): GdaConnection
      }
    }
    Gdk: {
      Display: {
        get_default(): GdkDisplay | null
      }
      Monitor: unknown
      CURRENT_TIME: number
    }
    Notify: {
      init(appName: string): void
      Notification: typeof NotifyNotification
    }
    Gst?: {
      Pipeline: unknown
      Element: unknown
    }
    GXml: {
      html_document_new_from_string(html: string, baseUrl: string): GXmlDocument | null
    }
  }
}
