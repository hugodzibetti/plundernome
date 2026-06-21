import { vi } from 'vitest'

class MockGtkWidget {
  add_css_class = vi.fn()
  remove_css_class = vi.fn()
  set_vexpand = vi.fn()
  set_hexpand = vi.fn()
  set_margin_start = vi.fn()
  set_margin_end = vi.fn()
  set_margin_top = vi.fn()
  set_margin_bottom = vi.fn()
  set_halign = vi.fn()
  set_valign = vi.fn()
  set_focusable = vi.fn()
  add_controller = vi.fn()
  set_visible = vi.fn()
  set_size_request = vi.fn()
  set_ellipsize = vi.fn()
  get_parent = vi.fn(() => null)
  set_parent = vi.fn()
  get_native = vi.fn(() => null)
  set_data = vi.fn()
  get_data = vi.fn(() => null)
  set_activatable_widget = vi.fn()
  notify = vi.fn()
  grab_focus = vi.fn()
  get_first_child = vi.fn(() => null)
  get_last_child = vi.fn(() => null)
  get_next_sibling = vi.fn(() => null)
  get_prev_sibling = vi.fn(() => null)
  get_row_at_index = vi.fn(() => null)
  get_selected_row = vi.fn(() => null)
  set_selection_mode = vi.fn()
  set_max_children_per_line = vi.fn()
  set_min_children_per_line = vi.fn()
  set_homogeneous = vi.fn()
  set_transition_type = vi.fn()
  add_named = vi.fn()
  set_visible_child_name = vi.fn()
  set_visible_child = vi.fn()
  add_child = vi.fn()
  remove = vi.fn()
  set_child = vi.fn()
  get_child = vi.fn(() => null)
  get_child_at_index = vi.fn(() => null)
  append = vi.fn()
  prepend = vi.fn()
  add_suffix = vi.fn()
  add_prefix = vi.fn()
  pack_start = vi.fn()
  pack_end = vi.fn()
  set_title = vi.fn()
  set_subtitle = vi.fn()
  set_description = vi.fn()
  set_label = vi.fn()
  get_text = vi.fn(() => '')
  set_placeholder_text = vi.fn()
  set_search_mode = vi.fn()
  get_search_mode = vi.fn(() => false)
  set_key_capture_widget = vi.fn()
  set_filename = vi.fn()
  set_from_pixbuf = vi.fn()
  set_content_fit = vi.fn()
  set_tooltip_text = vi.fn()
  set_fraction = vi.fn()
  get_value_as_int = vi.fn(() => 1)
  get_active = vi.fn(() => false)
  set_active = vi.fn()
  set_group = vi.fn()
  set_adjustment = vi.fn()
  set_scope = vi.fn()
  add_shortcut = vi.fn()
  start = vi.fn()
  present = vi.fn()
  destroy = vi.fn()
  get_file = vi.fn(() => ({ get_path: vi.fn(() => '/tmp') }))
  connect = vi.fn(() => 0)
  emit = vi.fn()
  stop_emission = vi.fn()
}

class MockGtkBin extends MockGtkWidget { }

class MockAdwBin extends MockGtkWidget {
  constructor() { super() }
}

class MockAdwActionRow extends MockGtkWidget {
  constructor(props?: Record<string, unknown>) {
    super()
    if (props) {
      if (props.title) this.set_title(props.title as string)
      if (props.subtitle) this.set_subtitle(props.subtitle as string)
    }
  }
}

const mockGtk = {
  Widget: MockGtkWidget as any,
  Bin: MockGtkBin as any,
  Box: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  Label: class extends MockGtkWidget {
    private _label = ''
    constructor(props?: Record<string, unknown>) {
      super()
      if (props?.label) { this._label = props.label as string; this.set_label(props.label as string) }
      if (props?.xalign !== undefined) Object.assign(this, { _xalign: props.xalign })
    }
    get_label = () => this._label
    override set_label = vi.fn((l: string) => { this._label = l })
  } as any,
  Button: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  Image: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  Picture: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  FlowBox: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  ListBox: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  ScrolledWindow: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  Viewport: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  Stack: class extends MockGtkWidget {
    set_transition_duration = vi.fn()
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  Overlay: class extends MockGtkWidget {
    add_overlay = vi.fn()
    remove_overlay = vi.fn()
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  SearchEntry: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  SearchBar: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  ToggleButton: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  CheckButton: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  SpinButton: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  Adjustment: class {} as any,
  DropDown: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  StringList: class {} as any,
  Switch: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  ProgressBar: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  GestureClick: class {
    set_button = vi.fn()
    connect = vi.fn(() => 0)
  } as any,
  Spinner: class extends MockGtkWidget {
    override start = vi.fn()
    stop = vi.fn()
    constructor() { super() }
  } as any,
  FileChooserNative: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  ShortcutController: class extends MockGtkWidget {
    constructor() { super() }
  } as any,
  Shortcut: class {} as any,
  ShortcutTrigger: { parse_string: vi.fn(() => ({})) },
  CallbackAction: vi.fn(() => ({})),
  CssProvider: vi.fn(() => ({ load_from_file: vi.fn() })),
  StyleContext: { add_provider_for_display: vi.fn() },
  PolicyType: { NEVER: 0, AUTOMATIC: 1 },
  Orientation: { VERTICAL: 0, HORIZONTAL: 1 },
  SelectionMode: { NONE: 0, SINGLE: 1 },
  StackTransitionType: { CROSSFADE: 0, SLIDE_LEFT_RIGHT: 1 },
  Align: { CENTER: 0, FILL: 1, START: 2, END: 3 },
  ContentFit: { COVER: 0, CONTAIN: 1, FILL: 2 },
  ResponseType: { ACCEPT: 0, REJECT: 1, CANCEL: 2, DELETE_EVENT: 3, OK: 4, YES: 5, NO: 6, APPLY: 7, HELP: 8 },
  FileChooserAction: { SELECT_FOLDER: 0, OPEN: 1, SAVE: 2 },
  ShortcutScope: { GLOBAL: 0, LOCAL: 1 },
  PopoverMenu: class extends MockGtkWidget {
    set_pointing_to = vi.fn()
    popup = vi.fn()
    popdown = vi.fn()
  } as any,
}

const mockAdw = {
  Bin: MockAdwBin as any,
  ApplicationWindow: class {} as any,
  HeaderBar: class extends MockGtkWidget {
    constructor() { super() }
  } as any,
  ToastOverlay: class extends MockGtkWidget {
    constructor() { super() }
  } as any,
  Toast: vi.fn(() => ({ set_timeout: vi.fn() })),
  ToastPriority: { NORMAL: 0, HIGH: 1 },
  ClampScrollable: class extends MockGtkWidget {
    get_vadjustment = vi.fn(() => ({
      connect: vi.fn(() => 0),
      get_value: vi.fn(() => 0),
      set_value: vi.fn(),
      get_upper: vi.fn(() => 1000),
      get_page_size: vi.fn(() => 500),
    }))
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  NavigationPage: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  NavigationSplitView: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  StatusPage: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  ActionRow: MockAdwActionRow as any,
  PreferencesGroup: class extends MockGtkWidget {
    add = vi.fn()
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  PreferencesPage: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  ComboRow: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  MessageDialog: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  WindowTitle: vi.fn(() => ({})) as any,
  ToolbarView: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
  } as any,
  Window: class extends MockGtkWidget {
    constructor(props?: Record<string, unknown>) { super(); Object.assign(this, props) }
    set_content = vi.fn()
  } as any,
  StyleManager: { get_default: vi.fn(() => ({ set_color_scheme: vi.fn() })) },
  ColorScheme: { DEFAULT: 0, FORCE_LIGHT: 1, FORCE_DARK: 2 },
  ResponseAppearance: { DESTRUCTIVE: 0, SUGGESTED: 1 },
}

const mockGLib = {
  get_home_dir: () => '/home/user',
  get_current_dir: () => '/tmp',
  build_filenamev: vi.fn(() => '/tmp/style.css'),
  get_user_data_dir: () => '/tmp/.local/share',
  mkdir_with_parents: vi.fn(),
  uuid_string_random: vi.fn(() => 'mock-uuid'),
  timeout_add: vi.fn(() => 42),
  source_remove: vi.fn(),
  get_monotonic_time: () => 1000000,
  spawn_command_line_sync: vi.fn(() => [0, '', '']),
  spawn_async: vi.fn(() => [null, 12345]),
  child_watch_add: vi.fn(),
  find_program_in_path: vi.fn(() => '/usr/bin/wine'),
  file_test: vi.fn(() => true),
  usleep: vi.fn(),
  remove: vi.fn(),
  file_set_contents: vi.fn(),
  get_tmp_dir: () => '/tmp',
  get_user_cache_dir: () => '/home/user/.cache',
  dir_open: vi.fn(() => null),
  dir_read_name: vi.fn(() => null),
  dir_close: vi.fn(),
  stat: vi.fn(() => ({ st_mode: 0o100000, st_size: 1000 })),
  glob: vi.fn(() => []),
  file_read_link: vi.fn(() => '/path/to/proton'),
  G_FILE_TEST_EXISTS: 1 << 0,
  G_FILE_TEST_IS_REGULAR: 1 << 2,
  G_FILE_TEST_IS_DIR: 1 << 1,
  G_SPAWN_DEFAULT: 0,
  G_SPAWN_SEARCH_PATH: 1 << 4,
  G_SPAWN_LEAVE_DESCRIPTORS_OPEN: 1 << 5,
  G_SPAWN_DO_NOT_REAP_CHILD: 1 << 6,
  PRIORITY_DEFAULT: 0,
  ChecksumType: { SHA256: 0, MD5: 1 },
  Checksum: vi.fn(() => ({
    update: vi.fn(),
    get_string: () => 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  })),
  compute_checksum_for_string: vi.fn(() => 'mock-cover-hash'),
  FileTest: { EXISTS: 1, IS_REGULAR: 2, IS_DIR: 4 },
}

const mockGio = {
  File: {
    new_for_path: vi.fn(() => ({
      query_exists: vi.fn(() => false),
      query_info: vi.fn(() => ({ get_size: () => 1000 })),
      get_parent: vi.fn(() => null),
      make_directory_with_parents: vi.fn(),
      replace: vi.fn(() => ({ write: vi.fn(), close: vi.fn() })),
      append_to: vi.fn(() => ({ write: vi.fn(), close: vi.fn() })),
      delete: vi.fn(),
      make_symbolic_link: vi.fn(),
      read: vi.fn(() => ({
        read_bytes: vi.fn(() => ({ toArray: () => new Uint8Array() })),
        close: vi.fn(),
      })),
      enumerate_children: vi.fn(() => ({
        next_file: vi.fn(() => null),
        close: vi.fn(),
      })),
      get_name: vi.fn(() => 'file'),
      get_file_type: vi.fn(() => 1),
      get_path: vi.fn(() => '/tmp'),
    })),
  },
  FileCreateFlags: { NONE: 0 },
  FileQueryInfoFlags: { NONE: 0 },
  FileType: { DIRECTORY: 1, REGULAR: 2 },
  Subprocess: {
    new: vi.fn(() => ({
      communicate_utf8: vi.fn(() => [true, new TextEncoder().encode('wine-8.0'), new TextEncoder().encode('')]),
      get_successful: vi.fn(() => true),
      get_exit_status: vi.fn(() => 0),
    })),
  },
  SubprocessFlags: { STDOUT_PIPE: 1, STDERR_PIPE: 2 },
  Cancellable: vi.fn(() => ({
    cancel: vi.fn(),
    is_cancelled: vi.fn(() => false),
  })),
  Settings: vi.fn(() => ({
    get_string: vi.fn(() => ''),
    get_int: vi.fn(() => 0),
    get_boolean: vi.fn(() => false),
    set_string: vi.fn(),
    set_int: vi.fn(),
    set_boolean: vi.fn(),
    bind: vi.fn(),
  })),
  SettingsSchemaSource: {
    get_default: vi.fn(() => ({ lookup: vi.fn(() => true) })),
  },
  SettingsBindFlags: { DEFAULT: 0 },
  DataInputStream: vi.fn(() => ({
    read_byte_array: vi.fn(() => null),
    close: vi.fn(),
  })),
}

const mockGdk = {}

const mockSoup = {
  Session: vi.fn(() => ({
    send: vi.fn(() => 200),
    timeout: 30,
    user_agent: '',
  })),
  Message: vi.fn(() => ({
    request_headers: { append: vi.fn() },
    response_headers: { foreach: vi.fn((cb: Function) => cb('content-type', 'text/html')), get_one: vi.fn(() => null) },
    response_body: { flatten: vi.fn(() => new TextEncoder().encode('test content')) },
    status_code: 200,
  })),
}

const mockGdaConnection = {
  close: vi.fn(),
  execute_select_command: vi.fn(() => null),
  execute_non_select_command: vi.fn(() => 0),
}

const mockGda = { Connection: { open_from_string: vi.fn(() => mockGdaConnection) } }

const mockNotify = {
  init: vi.fn(),
  Notification: {
    new: vi.fn(() => ({
      set_urgency: vi.fn(),
      show: vi.fn(),
    })),
  },
}

;(globalThis as any).mockGLib = mockGLib
;(globalThis as any).mockGio = mockGio
;(globalThis as any).mockGdaConnection = mockGdaConnection
;(globalThis as any).mockGda = mockGda
;(globalThis as any).mockSoup = mockSoup
;(globalThis as any).mockNotify = mockNotify
;(globalThis as any).mockGdk = mockGdk
;(globalThis as any).mockGtk = mockGtk
;(globalThis as any).mockAdw = mockAdw

;(globalThis as any).imports = {
  byteArray: {
    fromString: (s: string) => new TextEncoder().encode(s),
    toString: (bytes: Uint8Array) => new TextDecoder().decode(bytes),
  },
  gi: {
    Gtk: mockGtk as any,
    Adw: mockAdw as any,
    GLib: mockGLib as any,
    Gio: mockGio as any,
    Gdk: mockGdk as any,
    GObject: {
      registerClass: vi.fn((_info: Record<string, unknown>, cls: unknown) => cls) as any,
      TYPE_STRING: 'gchararray',
      TYPE_BOOLEAN: 'gboolean',
      TYPE_INT: 'gint',
      TYPE_OBJECT: 'GObject',
    },
    Soup: mockSoup as any,
    Gda: mockGda as any,
    Notify: mockNotify as any,
    GXml: {
      html_document_new_from_string: vi.fn(() => null),
    },
  },
}
