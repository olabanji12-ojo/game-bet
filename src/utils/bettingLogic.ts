import { BetSelection } from '../types';

export const calculateTotalOdds = (slipSelections: BetSelection[], betType: 'Single' | 'Accumulator') => {
  if (slipSelections.length === 0) return 0;
  if (betType === 'Single') {
    const sum = slipSelections.reduce((acc, curr) => acc + curr.odds, 0);
    return sum / slipSelections.length;
  } else {
    return slipSelections.reduce((acc, curr) => acc * curr.odds, 1);
  }
};

export const calculatePotentialPayout = (slipSelections: BetSelection[], betType: 'Single' | 'Accumulator', stakeStr: string, totalOdds: number) => {
  const numericStake = parseFloat(stakeStr) || 0;
  if (numericStake <= 0 || slipSelections.length === 0) return 0;
  
  if (betType === 'Single') {
    let totalPayout = 0;
    const distributedStake = numericStake / slipSelections.length;
    slipSelections.forEach(s => {
      totalPayout += distributedStake * s.odds;
    });
    return totalPayout;
  } else {
    return numericStake * totalOdds;
  }
};
