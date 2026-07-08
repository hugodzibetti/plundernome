export interface ICloudSaveService {
  backup(gameId: string): Promise<import('../../domain/cloud-save/types').SaveManifest | null>
  restore(manifest: import('../../domain/cloud-save/types').SaveManifest): Promise<boolean>
  listSaves(gameId?: string): Promise<import('../../domain/cloud-save/types').SaveManifest[]>
  syncToWebdav(manifest: import('../../domain/cloud-save/types').SaveManifest): Promise<boolean>
  syncFromWebdav(): Promise<import('../../domain/cloud-save/types').SaveManifest[]>
}
