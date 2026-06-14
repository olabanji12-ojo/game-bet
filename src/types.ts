export type MatchStatus = 'Active' | 'Settled';
export type BetStatus = 'Pending' | 'Won' | 'Lost' | 'Cancelled';
export type SelectionType = '1' | 'X' | '2' | 'Over' | 'Under';

export interface Score {
  home: number;
  away: number;
}

export interface MatchOdds {
  homeWin: number; // 1
  draw: number;    // X
  awayWin: number; // 2
  overUnder: number; // reference score e.g. 2.5
  overOdds: number;
  underOdds: number;
}

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  sport: string;
  status: MatchStatus;
  odds: MatchOdds;
  score: Score;
  startTime: string;
  currentMinute: number;
  result?: '1' | 'X' | '2'; // Home, Draw, Away
  overUnderResult?: 'Over' | 'Under';
}

export interface BetSelection {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  selection: SelectionType;
  odds: number;
  overUnderValue?: number;
}

export interface Bet {
  id: string;
  type: 'Single' | 'Accumulator';
  selections: BetSelection[];
  stake: number;
  potentialPayout: number;
  status: BetStatus;
  createdAt: string;
  settledAt?: string;
}

export interface WalletTransaction {
  id: string;
  type: 'Credit' | 'Debit' | 'Payout' | 'Refund';
  amount: number;
  description: string;
  balanceAfter: number;
  createdAt: string;
}

export interface Wallet {
  balance: number;
  history: WalletTransaction[];
}

export interface SystemEvent {
  id: string;
  type: string;
  payload: any;
  timestamp: string;
}
