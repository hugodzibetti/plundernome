export interface Friend {
  deviceId: string
  name: string
  status: 'online' | 'away' | 'offline'
  currentGame?: string
  lastSeen?: string
}

export interface FriendRequest {
  id: string
  fromDeviceId: string
  fromName: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
}
