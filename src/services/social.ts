import type { Friend, FriendRequest } from '../domain/social/types'
import type { CloudSaveRelayClient } from './cloud-save-relay'
import type { DatabaseService } from './database'

export class SocialService {
  constructor(
    private relay: CloudSaveRelayClient,
    private db: DatabaseService,
  ) {}

  async getFriends(): Promise<Friend[]> {
    return this.relay.getFriends()
  }

  async sendFriendRequest(deviceId: string): Promise<boolean> {
    return this.relay.sendFriendRequest(deviceId)
  }

  async acceptRequest(requestId: string): Promise<boolean> {
    return this.relay.respondToFriendRequest(requestId, true)
  }

  async rejectRequest(requestId: string): Promise<boolean> {
    return this.relay.respondToFriendRequest(requestId, false)
  }

  async updatePresence(status: string): Promise<void> {
    return this.relay.updatePresence(status)
  }

  async pendingRequests(): Promise<FriendRequest[]> {
    const rows = await this.db.query<{ data: string }>(
      `SELECT data FROM friend_requests WHERE status = 'pending' ORDER BY created_at DESC`,
    )
    return rows.map(r => JSON.parse(r.data) as FriendRequest)
  }
}
