export interface Achievement {
  id: string
  gameId: string
  name: string
  description?: string
  iconUrl?: string
  unlocked: boolean
  unlockedAt?: string
  source: 'file-scan' | 'steam' | 'manual'
  steamApiName?: string
  hidden: boolean
}

export interface AchievementSet {
  gameId: string
  achievements: Achievement[]
  total: number
  unlocked: number
}
