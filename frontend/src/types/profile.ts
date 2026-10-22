export interface LinkedInInfo {
  url?: string;
  headline?: string;
  currentRole?: string;
  skills?: string[];
}

export type CodingPlatform = 'leetcode' | 'hackerrank' | 'codechef' | 'github';

export interface PlatformLink {
  platform: CodingPlatform;
  username: string;
  profileUrl?: string;
  addedAt?: string;
}

export interface ActivityPoint {
  date: string;
  solved: number;
}

export interface RatingPoint {
  date: string;
  rating: number;
}

export interface ManualStatsOverride {
  rating?: number | null;
  totalSolved?: number | null;
  easySolved?: number | null;
  mediumSolved?: number | null;
  hardSolved?: number | null;
  contestsAttended?: number | null;
  activity?: ActivityPoint[];
  updatedAt?: string;
}

export interface CodingStats {
  platform: string;
  username: string;
  profileUrl?: string;
  rating?: number | null;
  maxRating?: number | null;
  totalSolved?: number | null;
  easySolved?: number | null;
  mediumSolved?: number | null;
  hardSolved?: number | null;
  contestsAttended?: number | null;
  rank?: number | null;
  activity?: ActivityPoint[];
  ratingHistory?: RatingPoint[];
  fetchedAt?: string;
  lastRefreshRequestedAt?: string;
  source: 'live' | 'cache' | 'manual';
  status: 'ok' | 'partial' | 'failed';
  error?: string;
  note?: string;
  selfReported?: boolean;
  manualOverride?: ManualStatsOverride;
}

export interface NotificationPreferences {
  emailStatusUpdates: boolean;
  jobAlerts: boolean;
  jobAlertsMode: 'instant' | 'digest' | 'off';
  minFitScore: number;
}

export interface UserProfile {
  _id?: string;
  userId: string;
  linkedin?: LinkedInInfo;
  platformLinks: PlatformLink[];
  codingStats: CodingStats[];
  notificationPreferences?: NotificationPreferences;
  createdAt?: string;
  updatedAt?: string;
}
