import { db } from './db';
import { eventBus } from './eventBus';
import { Bet, Match, SelectionType } from '../types';

class BackgroundWorkerService {
  private oddsTickInterval: NodeJS.Timeout | null = null;
  private matchProgressionInterval: NodeJS.Timeout | null = null;

  initialize() {
    console.log('[WorkerService] Initializing background event listeners...');
    
    // Subscribe to GAME_CONCLUDED to handle settlement side-effects
    eventBus.on('GAME_CONCLUDED', async (payload) => {
      console.log(`[WorkerService] Match concluded event received for match ${payload.matchId}. Triggering bet evaluation...`);
      this.evaluateAllPendingBets();
    });

    // Start background simulation loops
    this.startOddsFluctuationLoop();
    this.startMatchProgressionLoop();
  }

  // Evaluate and settle active bets securely
  evaluateAllPendingBets() {
    const pendingBets = db.getBets().filter(b => b.status === 'Pending');
    console.log(`[WorkerService] Evaluating ${pendingBets.length} pending bets...`);

    pendingBets.forEach((bet) => {
      let allSettled = true;
      let hasLostLeg = false;
      let wonLegsCount = 0;
      let totalSinglePayout = 0;

      // Evaluate each selection (leg) in the bet
      for (const selection of bet.selections) {
        const match = db.getMatch(selection.matchId);
        
        if (!match) {
          console.error(`[WorkerService] Match ${selection.matchId} not found during bet ${bet.id} evaluation.`);
          continue;
        }

        if (match.status !== 'Settled') {
          allSettled = false;
          continue;
        }

        // Evaluate outcome
        const selectionWon = this.isSelectionWinning(selection.selection, match);
        if (selectionWon) {
          wonLegsCount++;
          // For singles, each selection has a standalone stake payout
          // If a single bet consists of e.g. 3 selections, the stake is distributed as stake / selections.length
          // Or user placed stake on each. Let's compute payout as (stake / count) * odds for a simple prototype.
          const distributedStake = bet.stake / bet.selections.length;
          totalSinglePayout += distributedStake * selection.odds;
        } else {
          hasLostLeg = true;
        }
      }

      // Settle based on type
      if (bet.type === 'Accumulator') {
        if (hasLostLeg) {
          // Accumulators are all-or-nothing: one lost leg means the whole bet is lost immediately
          db.updateBetStatusAndPayout(bet.id, 'Lost', 0);
          console.log(`[WorkerService] Bet ${bet.id} (Accumulator) settled as LOST.`);
        } else if (allSettled && wonLegsCount === bet.selections.length) {
          // All legs won!
          db.updateBetStatusAndPayout(bet.id, 'Won', bet.potentialPayout);
          console.log(`[WorkerService] Bet ${bet.id} (Accumulator) settled as WON! Payout: $${bet.potentialPayout}`);
        }
      } else {
        // Single Bets
        if (allSettled) {
          if (wonLegsCount > 0) {
            db.updateBetStatusAndPayout(bet.id, 'Won', totalSinglePayout);
            console.log(`[WorkerService] Bet ${bet.id} (Single) settled as WON. Payout: $${totalSinglePayout}`);
          } else {
            db.updateBetStatusAndPayout(bet.id, 'Lost', 0);
            console.log(`[WorkerService] Bet ${bet.id} (Single) settled as LOST.`);
          }
        }
      }
    });
  }

  private isSelectionWinning(selection: SelectionType, match: Match): boolean {
    if (!match.result) return false;

    if (selection === '1' || selection === 'X' || selection === '2') {
      return match.result === selection;
    }

    if (selection === 'Over' || selection === 'Under') {
      return match.overUnderResult === selection;
    }

    return false;
  }

  // Real-time odds fluctuation loop to simulate a live market
  private startOddsFluctuationLoop() {
    this.oddsTickInterval = setInterval(() => {
      const activeMatches = db.getMatches().filter(m => m.status === 'Active');
      if (activeMatches.length === 0) return;

      // Select a random match to change odds
      const randomIndex = Math.floor(Math.random() * activeMatches.length);
      const match = activeMatches[randomIndex];

      // Generate random fluctuation between 0.95 and 1.05 (up/down 5%)
      const multiplier = 0.96 + Math.random() * 0.08;
      
      db.updateMatchOdds(match.id, multiplier);
    }, 8000); // Tick odds every 8 seconds
  }

  // Progress match minutes, fluctuate match scores (live play feel)
  private startMatchProgressionLoop() {
    this.matchProgressionInterval = setInterval(() => {
      const activeMatches = db.getMatches().filter(m => m.status === 'Active');
      if (activeMatches.length === 0) return;

      activeMatches.forEach(match => {
        // Tick up minutes
        if (match.currentMinute < 90) {
          match.currentMinute += 1;
        }

        // Random live goal/basket occurrence
        const eventChance = Math.random();
        if (eventChance > 0.97) {
          if (match.sport === 'Football') {
            const who = Math.random() > 0.5 ? 'home' : 'away';
            match.score[who] += 1;
            console.log(`[Simulation] GOAL! ${match.homeTeam} ${match.score.home} - ${match.score.away} ${match.awayTeam} (Min ${match.currentMinute})`);
            
            // Adjust odds directly on goals
            if (who === 'home') db.updateMatchOdds(match.id, 0.85); // Home odds shorten
            else db.updateMatchOdds(match.id, 1.15); // Home odds lengthen
          } else if (match.sport === 'Basketball') {
            const who = Math.random() > 0.5 ? 'home' : 'away';
            match.score[who] += Math.random() > 0.3 ? 2 : 3;
            // Basketball odds slightly change
            db.updateMatchOdds(match.id, who === 'home' ? 0.98 : 1.02);
          }
        }
      });
    }, 12000); // Progress minute and play every 12 seconds
  }

  shutdown() {
    if (this.oddsTickInterval) clearInterval(this.oddsTickInterval);
    if (this.matchProgressionInterval) clearInterval(this.matchProgressionInterval);
  }
}

export const workerService = new BackgroundWorkerService();
