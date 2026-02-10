
export enum RaidType {
  CHECKPOINT = 'Checkpoint',
  WORKPLACE = 'Workplace Raid',
  HOME = 'Residential Visit',
  STREET = 'Street Operation',
  TRANSPORT = 'Public Transport',
  OTHER = 'Other Activity'
}

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface Comment {
  id: string;
  text: string;
  timestamp: number;
  isAnonymous: boolean;
}

export interface Report {
  id: string;
  timestamp: number;
  type: RaidType;
  description: string;
  location: Location;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  severity: 'low' | 'medium' | 'high';
  isVerified?: boolean;
  isAnonymous: boolean;
  categoryAnalysis?: string;
  comments?: Comment[];
}

export interface RightsInfo {
  title: string;
  content: string;
  source: string;
}
