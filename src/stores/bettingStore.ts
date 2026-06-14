import { create } from 'zustand';
import { BetSelection } from '../types';

interface BettingState {
  selectedSport: string;
  setSelectedSport: (sport: string) => void;
  
  betType: 'Single' | 'Accumulator';
  setBetType: (type: 'Single' | 'Accumulator') => void;
  
  slipSelections: BetSelection[];
  setSlipSelections: (selections: BetSelection[] | ((prev: BetSelection[]) => BetSelection[])) => void;
  clearSelections: () => void;
  toggleSelection: (newSelection: BetSelection) => void;
  
  stake: string;
  setStake: (stake: string) => void;
  
  activeTab: 'Feed' | 'History';
  setActiveTab: (tab: 'Feed' | 'History') => void;
}

export const useBettingStore = create<BettingState>((set, get) => ({
  selectedSport: 'All',
  setSelectedSport: (sport) => set({ selectedSport: sport }),
  
  betType: 'Accumulator',
  setBetType: (type) => set({ betType: type }),
  
  slipSelections: [],
  setSlipSelections: (selections) => {
    if (typeof selections === 'function') {
      set((state) => ({ slipSelections: selections(state.slipSelections) }));
    } else {
      set({ slipSelections: selections });
    }
  },
  clearSelections: () => set({ slipSelections: [] }),
  toggleSelection: (newSelection) => {
    const { slipSelections, betType } = get();
    const existingIndex = slipSelections.findIndex(
      s => s.matchId === newSelection.matchId && s.selection === newSelection.selection
    );

    if (existingIndex > -1) {
      set({ slipSelections: slipSelections.filter((_, idx) => idx !== existingIndex) });
    } else {
      if (betType === 'Accumulator') {
        const matchesInSlip = slipSelections.map(s => s.matchId);
        if (matchesInSlip.includes(newSelection.matchId)) {
          set({ slipSelections: slipSelections.filter(s => s.matchId !== newSelection.matchId).concat(newSelection) });
          return;
        }
      }
      set({ slipSelections: [...slipSelections, newSelection] });
    }
  },
  
  stake: '50.00',
  setStake: (stake) => set({ stake }),
  
  activeTab: 'Feed',
  setActiveTab: (tab) => set({ activeTab: tab })
}));
