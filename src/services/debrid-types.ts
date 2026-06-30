export interface IDebridService {
  unrestrict(url: string): Promise<string | null>
  checkHealth(): Promise<boolean>
}
