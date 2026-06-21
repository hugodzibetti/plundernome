/**
 * Thin adapter for GLib/Gio operations used by the controller.
 * Allows tests to inject a fake implementation.
 */
export interface ISystem {
  timeoutAdd(priority: number, interval: number, callback: () => boolean): number;
  sourceRemove(id: number): void;
  getHomeDir(): string;
  uuidString(): string;
}

export class GjsSystem implements ISystem {
  timeoutAdd(priority: number, interval: number, callback: () => boolean): number {
    const { GLib } = imports.gi;
    return GLib.timeout_add(priority, interval, callback);
  }

  sourceRemove(id: number): void {
    const { GLib } = imports.gi;
    GLib.source_remove(id);
  }

  getHomeDir(): string {
    const { GLib } = imports.gi;
    return GLib.get_home_dir();
  }

  uuidString(): string {
    const { GLib } = imports.gi;
    return GLib.uuid_string_random();
  }
}
