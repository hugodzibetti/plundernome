import { vi } from 'vitest'

const mockGLib = {
  get_home_dir: () => '/home/user',
  get_monotonic_time: () => 1000000,
  uuid_string_random: vi.fn(() => 'mock-uuid-12345'),
  file_test: vi.fn(() => true),
  mkdir_with_parents: vi.fn(),
  spawn_command_line_sync: vi.fn(() => [0, '', '']),
  spawn_command_line_async: vi.fn(() => [true, 12345]),
  spawn_async: vi.fn(() => [null, 12345]),
  child_watch_add: vi.fn(),
  find_program_in_path: vi.fn(() => '/usr/bin/wine'),
  usleep: vi.fn(),
  timeout_add: vi.fn(() => 42),
  source_remove: vi.fn(),
  remove: vi.fn(),
  file_set_contents: vi.fn(),
  get_tmp_dir: () => '/tmp',
  get_user_cache_dir: () => '/home/user/.cache',
  compute_checksum_for_string: vi.fn(() => 'mock-cover-hash'),
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
  FileTest: { EXISTS: 1, IS_REGULAR: 2, IS_DIR: 4 },
}

const mockGdaConnection = {
  close: vi.fn(),
  execute_select_command: vi.fn(() => null),
  execute_non_select_command: vi.fn(() => 0),
}

const mockGio = {
  File: {
    new_for_path: vi.fn(() => ({
      query_exists: vi.fn(() => true),
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

const mockNotify = {
  init: vi.fn(),
  Notification: {
    new: vi.fn(() => ({
      add_action: vi.fn(),
      set_urgency: vi.fn(),
      show: vi.fn(),
      connect: vi.fn(),
    })),
  },
}

const mockGda = { Connection: { open_from_string: vi.fn(() => mockGdaConnection) } }

;(globalThis as any).mockGLib = mockGLib
;(globalThis as any).mockGio = mockGio
;(globalThis as any).mockGdaConnection = mockGdaConnection
;(globalThis as any).mockGda = mockGda
;(globalThis as any).mockSoup = mockSoup
;(globalThis as any).mockNotify = mockNotify

;(globalThis as any).imports = {
  byteArray: {
    fromString: (s: string) => new TextEncoder().encode(s),
    toString: (bytes: Uint8Array) => new TextDecoder().decode(bytes),
  },
  gi: {
    GLib: mockGLib,
    Gio: mockGio,
    Soup: mockSoup,
    Notify: mockNotify,
    Gda: mockGda,
    GXml: {
      html_document_new_from_string: vi.fn(() => null),
      html_document_new_from_bytes: vi.fn(() => null),
      Document: vi.fn(() => ({
        query_selector: vi.fn(() => null),
        query_selector_all: vi.fn(() => []),
        get_elements_by_tag_name: vi.fn(() => []),
        get_element_by_id: vi.fn(() => null),
        root_element: vi.fn(() => null),
      })),
      Element: vi.fn(() => ({
        get_attribute: vi.fn(() => null),
        get_children: vi.fn(() => []),
        query_selector: vi.fn(() => null),
        query_selector_all: vi.fn(() => []),
        text_content: '',
        inner_html: '',
      })),
    },
    Gtk: {}, Adw: {}, GObject: {}, Gdk: {},
  },
}

;(globalThis as any).mockTorrentService = {
  fetchTorrentInfo: vi.fn(() => Promise.resolve({ name: 'test.torrent', size: 1000, files: [] })),
  downloadTorrent: vi.fn(() => Promise.resolve('/tmp/test.torrent')),
}

;(globalThis as any).mockHtmlParserService = {
  parsePage: vi.fn(() => Promise.resolve({ title: 'Test', links: [] })),
  extractGames: vi.fn(() => Promise.resolve([])),
}

;(globalThis as any).mockSyncService = {
  exportLibrary: vi.fn(() => Promise.resolve({ ok: true, value: '{}' })),
  importLibrary: vi.fn(() => Promise.resolve({ ok: true, value: [] })),
  broadcastPresence: vi.fn(),
  discoverPeers: vi.fn(() => Promise.resolve([])),
  startSync: vi.fn(),
  stopSync: vi.fn(),
}

;(globalThis as any).mockLANDiscovery = {
  start: vi.fn(),
  stop: vi.fn(),
  onPeerFound: vi.fn(),
  getPeers: vi.fn(() => []),
}
