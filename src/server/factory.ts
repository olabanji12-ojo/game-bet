import { BetSelection } from '../types';
import { roundToTwo } from './db';

export interface BetCalculationResult {
  stake: number;
  cumulativeOdds: number;
  potentialPayout: number;
  isValid: boolean;
  errorMessage?: string;
  description: string;
}

export interface IBetCalculation {
  calculate(selections: BetSelection[], stake: number): BetCalculationResult;
}

export class SingleBetCalculation implements IBetCalculation {
  calculate(selections: BetSelection[], stake: number): BetCalculationResult {
    if (selections.length === 0) {
      return {
        stake,
        cumulativeOdds: 0,
        potentialPayout: 0,
        isValid: false,
        errorMessage: 'At least one selection is required for a Single bet.',
        description: 'Single Bets'
      };
    }

    // In a prototype single bet, if the user inputs $10 stake, it places the $10 stake
    // on each selection separately, or treats them as individual parallel single bets.
    // Let's say potential payout is the sum of payouts of each separate selection:
    // Payout = sum(stake * selection.odds)
    let totalPayout = 0;
    let avgOdds = 0;
    
    selections.forEach(sel => {
      totalPayout += stake * sel.odds;
      avgOdds += sel.odds;
    });

    avgOdds = selections.length > 0 ? avgOdds / selections.length : 0;

    return {
      stake,
      cumulativeOdds: roundToTwo(avgOdds), // Display average odds for information
      potentialPayout: roundToTwo(totalPayout),
      isValid: stake > 0,
      errorMessage: stake <= 0 ? 'Stake amount must be greater than zero.' : undefined,
      description: `Singles (${selections.length})`
    };
  }
}

export class AccumulatorBetCalculation implements IBetCalculation {
  calculate(selections: BetSelection[], stake: number): BetCalculationResult {
    if (selections.length < 2) {
      return {
        stake,
        cumulativeOdds: 0,
        potentialPayout: 0,
        isValid: false,
        errorMessage: 'An Accumulator (Multi-Bet) requires at least 2 selections.',
        description: 'Accumulator'
      };
    }

    // Polish: Real-world check: Cannot include multiple selections from the same match ID
    const matchIds = selections.map(s => s.matchId);
    const hasDuplicates = new Set(matchIds).size !== matchIds.length;
    if (hasDuplicates) {
      return {
        stake,
        cumulativeOdds: 0,
        potentialPayout: 0,
        isValid: false,
        errorMessage: 'Accumulator bets cannot combine multiple selections from the exact same match.',
        description: 'Accumulator (Invalid)'
      };
    }

    // Combined odds is product of all selection odds
    const cumulativeOddsRaw = selections.reduce((product, sel) => product * sel.odds, 1);
    const cumulativeOdds = roundToTwo(cumulativeOddsRaw);
    const potentialPayout = roundToTwo(stake * cumulativeOdds);

    return {
      stake,
      cumulativeOdds,
      potentialPayout,
      isValid: stake > 0,
      errorMessage: stake <= 0 ? 'Stake amount must be greater than zero.' : undefined,
      description: `${selections.length}-Fold Accumulator`
    };
  }
}

export class BetCalculationFactory {
  static getCalculator(type: 'Single' | 'Accumulator'): IBetCalculation {
    switch (type) {
      case 'Single':
        return new SingleBetCalculation();
      case 'Accumulator':
        return new AccumulatorBetCalculation();
      default:
        throw new Error(`Unsupported bet type factory target: ${type}`);
    }
  }

  static run(type: 'Single' | 'Accumulator', selections: BetSelection[], stake: number): BetCalculationResult {
    const calculator = this.getCalculator(type);
    return calculator.calculate(selections, stake);
  }
}
