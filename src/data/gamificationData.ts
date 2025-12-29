export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: string;
}

export interface LeaderboardUser {
  id: string;
  name: string;
  avatar: string;
  points: number;
  level: number;
  badges: Badge[];
  reviewCount: number;
  checkInCount: number;
  streak: number;
}

export const badges: Badge[] = [
  { id: '1', name: 'First Steps', description: 'Write your first review', icon: '✍️', rarity: 'common' },
  { id: '2', name: 'Explorer', description: 'Visit 5 different businesses', icon: '🧭', rarity: 'common' },
  { id: '3', name: 'Regular', description: 'Check in 10 times', icon: '📍', rarity: 'common' },
  { id: '4', name: 'Foodie', description: 'Review 5 restaurants', icon: '🍽️', rarity: 'rare' },
  { id: '5', name: 'Social Butterfly', description: 'Connect with 10 community members', icon: '🦋', rarity: 'rare' },
  { id: '6', name: 'Streak Master', description: 'Maintain a 7-day streak', icon: '🔥', rarity: 'rare' },
  { id: '7', name: 'Influencer', description: 'Get 50 likes on your reviews', icon: '⭐', rarity: 'epic' },
  { id: '8', name: 'Local Legend', description: 'Reach Level 10', icon: '👑', rarity: 'epic' },
  { id: '9', name: 'Community Champion', description: 'Help 25 local businesses', icon: '🏆', rarity: 'legendary' },
  { id: '10', name: 'Circle Elder', description: 'Be active for 1 year', icon: '💎', rarity: 'legendary' },
];

export const leaderboardUsers: LeaderboardUser[] = [
  {
    id: '1',
    name: 'Sarah Mitchell',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
    points: 4850,
    level: 12,
    badges: [badges[0], badges[1], badges[3], badges[6], badges[7]],
    reviewCount: 47,
    checkInCount: 89,
    streak: 14,
  },
  {
    id: '2',
    name: 'Marcus Chen',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    points: 4200,
    level: 11,
    badges: [badges[0], badges[2], badges[4], badges[5], badges[7]],
    reviewCount: 38,
    checkInCount: 112,
    streak: 21,
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
    points: 3890,
    level: 10,
    badges: [badges[0], badges[1], badges[2], badges[5]],
    reviewCount: 32,
    checkInCount: 76,
    streak: 8,
  },
  {
    id: '4',
    name: 'David Kim',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100',
    points: 3450,
    level: 9,
    badges: [badges[0], badges[3], badges[4]],
    reviewCount: 28,
    checkInCount: 54,
    streak: 5,
  },
  {
    id: '5',
    name: 'Lisa Thompson',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
    points: 3100,
    level: 8,
    badges: [badges[0], badges[1], badges[2]],
    reviewCount: 24,
    checkInCount: 67,
    streak: 12,
  },
  {
    id: '6',
    name: 'James Wilson',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
    points: 2780,
    level: 7,
    badges: [badges[0], badges[2]],
    reviewCount: 19,
    checkInCount: 45,
    streak: 3,
  },
  {
    id: '7',
    name: 'Anna Kowalski',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
    points: 2450,
    level: 6,
    badges: [badges[0], badges[1]],
    reviewCount: 15,
    checkInCount: 38,
    streak: 6,
  },
  {
    id: '8',
    name: 'Michael Brown',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100',
    points: 2100,
    level: 5,
    badges: [badges[0]],
    reviewCount: 12,
    checkInCount: 29,
    streak: 2,
  },
  {
    id: '9',
    name: 'Sofia Garcia',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100',
    points: 1850,
    level: 5,
    badges: [badges[0], badges[2]],
    reviewCount: 10,
    checkInCount: 34,
    streak: 4,
  },
  {
    id: '10',
    name: 'Chris Johnson',
    avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=100',
    points: 1600,
    level: 4,
    badges: [badges[0]],
    reviewCount: 8,
    checkInCount: 22,
    streak: 1,
  },
];

export const getLevelProgress = (points: number): { current: number; next: number; progress: number } => {
  const levels = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500];
  let level = 0;
  for (let i = 0; i < levels.length; i++) {
    if (points >= levels[i]) level = i;
  }
  const current = levels[level] || 0;
  const next = levels[level + 1] || levels[level] + 1000;
  const progress = ((points - current) / (next - current)) * 100;
  return { current, next, progress };
};

export const getRarityColor = (rarity: Badge['rarity']): string => {
  switch (rarity) {
    case 'common': return 'bg-muted text-muted-foreground';
    case 'rare': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'epic': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'legendary': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  }
};
