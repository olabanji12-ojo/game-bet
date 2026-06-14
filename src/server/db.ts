import { Match, Bet, Wallet, WalletTransaction, SelectionType, BetStatus, Score } from '../types';
import { eventBus } from './eventBus';

// Safe decimal arithmetic helper
export function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

class MemoryDatabase {
  private matches: Match[] = [];
  private bets: Bet[] = [];
  private wallet: Wallet = {
    balance: 1000.00,
    history: [
      {
        id: 'tx_init',
        type: 'Credit',
        amount: 1000.00,
        description: 'Simulated Signup Play Credits Granted',
        balanceAfter: 1000.00,
        createdAt: new Date().toISOString()
      }
    ]
  };

  constructor() {
    this.seedMatches();
  }

  private seedMatches() {
    const now = new Date();
    
    const sampleMatches: Omit<Match, 'id'>[] = [
      {
        homeTeam: 'Real Madrid',
        awayTeam: 'FC Barcelona',
        sport: 'Football',
        status: 'Active',
        startTime: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        currentMinute: 42,
        score: { home: 1, away: 1 },
        odds: {
          homeWin: 2.15,
          draw: 3.40,
          awayWin: 3.10,
          overUnder: 2.5,
          overOdds: 1.85,
          underOdds: 1.95
        }
      },
      {
        homeTeam: 'LA Lakers',
        awayTeam: 'Golden State Warriors',
        sport: 'Basketball',
        status: 'Active',
        startTime: new Date(now.getTime() + 15 * 60 * 1000).toISOString(), // 15 mins from now
        currentMinute: 78, // Towards 4th quarter
        score: { home: 102, away: 99 },
        odds: {
          homeWin: 1.80,
          draw: 15.0,
          awayWin: 2.10,
          overUnder: 205.5,
          overOdds: 1.90,
          underOdds: 1.90
        }
      },
      {
        homeTeam: 'Carlos Alcaraz',
        awayTeam: 'Jannik Sinner',
        sport: 'Tennis',
        status: 'Active',
        startTime: new Date(now.getTime() + 180 * 60 * 1000).toISOString(),
        currentMinute: 110,
        score: { home: 2, away: 1 }, // Sets
        odds: {
          homeWin: 1.95,
          draw: 50.0,
          awayWin: 1.85,
          overUnder: 38.5, // e.g. total games
          overOdds: 1.88,
          underOdds: 1.88
        }
      },
      {
        homeTeam: 'Manchester City',
        awayTeam: 'Arsenal FC',
        sport: 'Football',
        status: 'Active',
        startTime: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
        currentMinute: 12,
        score: { home: 0, away: 0 },
        odds: {
          homeWin: 1.90,
          draw: 3.50,
          awayWin: 3.80,
          overUnder: 2.5,
          overOdds: 1.80,
          underOdds: 2.00
        }
      },
      {
        homeTeam: 'Boston Celtics',
        awayTeam: 'Milwaukee Bucks',
        sport: 'Basketball',
        status: 'Active',
        startTime: new Date(now.getTime() + 120 * 60 * 1000).toISOString(),
        currentMinute: 0,
        score: { home: 0, away: 0 },
        odds: {
          homeWin: 1.65,
          draw: 16.0,
          awayWin: 2.40,
          overUnder: 228.5,
          overOdds: 1.95,
          underOdds: 1.85
        }
      }
    ];

    this.matches = sampleMatches.map((m, idx) => ({
      ...m,
      id: `m_${idx + 1}`
    }));
  }

  // Live Match Methods
  getMatches(): Match[] {
    return this.matches;
  }

  getMatch(id: string): Match | undefined {
    return this.matches.find(m => m.id === id);
  }

  updateMatchOdds(id: string, multiplier: number) {
    const match = this.getMatch(id);
    if (!match || match.status === 'Settled') return;

    match.odds.homeWin = roundToTwo(Math.max(1.05, match.odds.homeWin * multiplier));
    match.odds.awayWin = roundToTwo(Math.max(1.05, match.odds.awayWin * multiplier));
    if (match.odds.draw > 0) {
      match.odds.draw = roundToTwo(Math.max(1.05, match.odds.draw * (1 + (multiplier - 1) * 0.5)));
    }
    
    // Slightly tick scores just to simulate ongoing movement
    if (Math.random() > 0.7) {
      if (match.sport === 'Football') {
        const whoScores = Math.random() > 0.5 ? 'home' : 'away';
        match.score[whoScores] += 1;
      } else if (match.sport === 'Basketball') {
        const whoScores = Math.random() > 0.5 ? 'home' : 'away';
        match.score[whoScores] += Math.random() > 0.3 ? 2 : 3;
      }
    }

    if (match.currentMinute < 90) {
      match.currentMinute += 1;
    }

    eventBus.emit('ODDS_UPDATED', { matchId: id, odds: match.odds, score: match.score, currentMinute: match.currentMinute });
  }

  settleMatch(matchId: string, result: '1' | 'X' | '2', overUnderResult: 'Over' | 'Under', score: Score): boolean {
    const match = this.getMatch(matchId);
    if (!match || match.status === 'Settled') {
      return false;
    }

    match.status = 'Settled';
    match.result = result;
    match.overUnderResult = overUnderResult;
    match.score = score;
    match.currentMinute = 90; // Final time

    console.log(`[MemoryDB] Settling match ${matchId} with Result: ${result}, Over/Under: ${overUnderResult}`);
    
    // Emit GAME_CONCLUDED event so worker services can settle bets
    eventBus.emit('GAME_CONCLUDED', {
      matchId,
      result,
      overUnderResult,
      score,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam
    });

    return true;
  }

  // Wallet Methods
  getWallet(): Wallet {
    return this.wallet;
  }

  resetWalletBalance(): Wallet {
    this.wallet.balance = 1000.00;
    this.wallet.history = [
      {
        id: 'tx_reset_' + Date.now(),
        type: 'Credit',
        amount: 1000.00,
        description: 'Wallet Balance Reset',
        balanceAfter: 1000.00,
        createdAt: new Date().toISOString()
      }
    ];
    eventBus.emit('WALLET_UPDATED', this.wallet);
    return this.wallet;
  }

  depositWalletCustom(amount: number): Wallet {
    const depositAmount = roundToTwo(amount);
    if (depositAmount <= 0) {
      throw new Error('Deposit amount must be a positive number.');
    }
    
    this.wallet.balance = roundToTwo(this.wallet.balance + depositAmount);
    
    const tx: WalletTransaction = {
      id: 'tx_dep_' + Math.random().toString(36).substring(2, 11),
      type: 'Credit',
      amount: depositAmount,
      description: `Manual Simulated Deposit`,
      balanceAfter: this.wallet.balance,
      createdAt: new Date().toISOString()
    };
    
    this.wallet.history.unshift(tx);
    eventBus.emit('WALLET_UPDATED', this.wallet);
    return this.wallet;
  }

  // Transaction-Safe Bet Placement (All-or-Nothing Transaction)
  placeBetTx(type: 'Single' | 'Accumulator', selections: any[], stake: number, potentialPayout: number): Bet {
    if (this.wallet.balance < stake) {
      throw new Error('Insufficient wallet balance to place this bet.');
    }

    const currentBalanceBefore = this.wallet.balance;
    const debitAmount = roundToTwo(stake);

    try {
      // 1. Instantiate the Bet
      const betId = 'b_' + Math.random().toString(36).substring(2, 11);
      const newBet: Bet = {
        id: betId,
        type,
        selections,
        stake: debitAmount,
        potentialPayout: roundToTwo(potentialPayout),
        status: 'Pending',
        createdAt: new Date().toISOString()
      };

      // 2. Decrement wallet balance and add transaction
      this.wallet.balance = roundToTwo(currentBalanceBefore - debitAmount);
      
      const tx: WalletTransaction = {
        id: 'tx_' + Math.random().toString(36).substring(2, 11),
        type: 'Debit',
        amount: debitAmount,
        description: `Bet Placement: ID ${betId} (${type} Bet)`,
        balanceAfter: this.wallet.balance,
        createdAt: new Date().toISOString()
      };

      this.wallet.history.unshift(tx);
      this.bets.unshift(newBet);

      // Emit balance and bet update
      eventBus.emit('WALLET_UPDATED', this.wallet);
      eventBus.emit('BET_PLACED', newBet);

      return newBet;
    } catch (err) {
      // If anything fails within this method, rollback manually (though with custom memory structure,
      // keeping steps in state-modifications at the end is easiest)
      this.wallet.balance = currentBalanceBefore;
      throw new Error(`Bet placement transactional failure: ${(err as Error).message}`);
    }
  }

  // Settle single/accumulator status
  getBets(): Bet[] {
    return this.bets;
  }

  getBet(id: string): Bet | undefined {
    return this.bets.find(b => b.id === id);
  }

  // Settle individual bet and pay out users (All-or-Nothing transaction)
  updateBetStatusAndPayout(betId: string, status: 'Won' | 'Lost', payout: number): boolean {
    const bet = this.getBet(betId);
    if (!bet || bet.status !== 'Pending') {
      return false;
    }

    bet.status = status;
    bet.settledAt = new Date().toISOString();

    if (status === 'Won') {
      const currentBalance = this.wallet.balance;
      const creditAmount = roundToTwo(payout);
      this.wallet.balance = roundToTwo(currentBalance + creditAmount);

      const tx: WalletTransaction = {
        id: 'tx_' + Math.random().toString(36).substring(2, 11),
        type: 'Payout',
        amount: creditAmount,
        description: `Bet Win Payout: ID ${betId}`,
        balanceAfter: this.wallet.balance,
        createdAt: new Date().toISOString()
      };

      this.wallet.history.unshift(tx);
      eventBus.emit('WALLET_UPDATED', this.wallet);
    } else {
      // Lost: Bet is just settled as lost. Money was already debited.
      console.log(`[MemoryDB] Bet ${betId} Settle Status: ${status}`);
    }

    eventBus.emit('BET_SETTLED', bet);
    return true;
  }
}

export const db = new MemoryDatabase();
