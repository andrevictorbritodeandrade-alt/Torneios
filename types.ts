
export interface Student {
  id: number;
  name: string;
  attendance: { [date: string]: 'P' | 'F' | null };
}

export interface ClassData {
  id: string;
  name: string;
  grade: string; // '6' or '7'
  students: Student[];
  schedule?: string;
  days?: string[];
}

export interface ClassDataMap {
  [classId: string]: ClassData;
}

export interface ClassificationStudent {
  position: string;
  name: string;
  points: string;
  wins: number;
  losses: number;
  draws: number;
}

export interface ClassificationData {
  name: string;
  students: ClassificationStudent[];
}

export interface ClassificationDataMap {
  [classId: string]: ClassificationData;
}

export interface ActivityLogEntry {
  date: string;
  classes?: string[]; // New field for selected classes
  activities: string[];
}

export interface ActivityLogData {
  title: string;
  header: {
    government: string;
    city: string;
    department: string;
    school: string;
    professor: string;
    project: string;
  };
  log: ActivityLogEntry[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface GameRecord {
  id: string;
  date: string;
  opponent: string;
  result: 'win' | 'loss' | 'draw';
  moves: number;
  accuracy?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  elo: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface DashboardCardData {
  id: string;
  title: string;
  value: string | number;
  type: 'number' | 'currency' | 'text' | 'status';
  trend?: string;
  icon?: string;
  lastUpdated: number;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export type ViewState = 'home' | 'statistics' | 'classes' | 'tournaments' | 'activities' | 'play' | 'profile' | 'ementa' | 'exercises' | 'notation' | 'schedule' | 'gallery';

// --- TOURNAMENT TYPES ---
export interface Player {
  id: string;
  name: string;
  class: string;
  // Stats
  points: number;
  wins: number;
  draws: number;
  losses: number;
  gamesPlayed: number;
  goalsFor?: number; // Goals/Points scored (Futebol, Basquete, etc.)
  goalsAgainst?: number; // Goals/Points conceded
}

export interface Match {
  id: string;
  p1Id: string;
  p2Id: string;
  result: '1-0' | '0-1' | '0.5-0.5' | null;
  p1Score?: number; // goals/points scored in matches
  p2Score?: number;
  groupIndex: number; // -1 for Finals
}

export interface Group {
  id: number;
  name: string;
  players: string[]; // Player IDs
}

export interface KnockoutMatch {
  id: string;
  p1Id: string | null; // null if waiting for previous round winner
  p2Id: string | null;
  p1Score?: number;
  p2Score?: number;
  winnerId?: string;
  roundIndex: number;
  matchIndex: number;
}

export interface KnockoutRound {
  name: string;
  matches: KnockoutMatch[];
}

export interface TournamentState {
  id?: string;
  name?: string;
  createdAt?: number;
  summary?: string;
  stage: 'setup' | 'groups' | 'finals' | 'finished';
  players: Player[];
  groups: Group[];
  matches: Match[];
  finalMatches: Match[];
  finalPlayers: string[];
  rules?: string[];
  isInterclassesSorteio?: boolean;
  // Extended tournament options
  modality?: 'xadrez_dama' | 'futebol_futsal' | 'basquete' | 'handebol' | 'volei' | 'queimado' | 'tenis_mesa' | 'outro';
  participantType?: 'individual' | 'team';
  format?: 'mata_mata' | 'grupos_mata_mata' | 'grupo_unico';
  finalsFormat?: 'copa_do_mundo' | 'tradicional';
  numAdvancersPerGroup?: number; // e.g. 1 or 2
  knockoutRounds?: KnockoutRound[];
  currentKnockoutRoundIndex?: number;
}

export interface GalleryImage {
  id: string;
  title: string;
  url: string;
  description: string;
  createdAt: number;
}

export interface GalleryData {
  images: GalleryImage[];
}
