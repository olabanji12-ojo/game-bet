import React, { useState } from 'react';
import { Layers, Trash2, AlertTriangle, Sparkles } from 'lucide-react';
import { useBettingStore } from '../stores/bettingStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { placeBet } from '../services/api';
import { calculateTotalOdds, calculatePotentialPayout } from '../utils/bettingLogic';

export const BetSlip: React.FC<{ walletBalance: number }> = ({ walletBalance }) => {
  const queryClient = useQueryClient();
  const { slipSelections, clearSelections, setSlipSelections, betType, setBetType, stake, setStake } = useBettingStore();
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [placeSuccess, setPlaceSuccess] = useState<string | null>(null);

  const totalOdds = calculateTotalOdds(slipSelections, betType);
  const potentialPayout = calculatePotentialPayout(slipSelections, betType, stake, totalOdds);

  const placeBetMutation = useMutation({
    mutationFn: (data: { type: 'Single' | 'Accumulator', selections: any[], stake: number }) => 
      placeBet(data.type, data.selections, data.stake),
    onSuccess: () => {
      setPlaceSuccess(`Tx Authorized! Bet placed successfully.`);
      clearSelections();
      queryClient.invalidateQueries({ queryKey: ['platformState'] });
      setTimeout(() => setPlaceSuccess(null), 5000);
    },
    onError: (err: Error) => setPlaceError(err.message)
  });

  const handlePlaceBet = () => {
    setPlaceError(null);
    setPlaceSuccess(null);
    const numericStake = parseFloat(stake);

    if (slipSelections.length === 0) {
      setPlaceError('Select at least 1 market prediction before booking bet.');
      return;
    }
    if (isNaN(numericStake) || numericStake <= 0) {
      setPlaceError('Please input a valid positive simulated stake amount.');
      return;
    }
    if (walletBalance < numericStake) {
      setPlaceError('Insufficient playground balance to authorize this transaction.');
      return;
    }
    if (betType === 'Accumulator' && slipSelections.length < 2) {
      setPlaceError('Accumulators require a minimum of 2 separate matches.');
      return;
    }

    placeBetMutation.mutate({
      type: betType,
      selections: slipSelections,
      stake: numericStake
    });
  };

  return (
    <>
      <div className="p-4 bg-white text-black shrink-0 flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-1">
          <Layers className="w-3.5 h-3.5" /> Bet_Slip.Factory
        </h2>
        {slipSelections.length > 0 && (
          <button 
            onClick={clearSelections}
            className="text-[10px] text-red-600 hover:text-red-950 font-bold uppercase underline"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="p-4 bg-[#0F0F0F] border-b border-[#222]">
        <div className="grid grid-cols-2 gap-1 bg-black p-0.5 border border-[#333] rounded">
          <button
            type="button"
            onClick={() => { setBetType('Single'); setPlaceError(null); }}
            className={`py-1.5 text-[10px] font-bold uppercase transition-all rounded ${
              betType === 'Single' ? 'bg-[#1A1A1A] text-[#00FF41] border border-[#333]' : 'text-[#666] hover:text-white'
            }`}
          >
            Single Bets
          </button>
          <button
            type="button"
            onClick={() => { setBetType('Accumulator'); setPlaceError(null); }}
            className={`py-1.5 text-[10px] font-bold uppercase transition-all rounded ${
              betType === 'Accumulator' ? 'bg-[#1A1A1A] text-[#00FF41] border border-[#333]' : 'text-[#666] hover:text-white'
            }`}
          >
            Accumulator
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[300px] lg:max-h-none">
        {slipSelections.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-[#555] py-8 font-serif italic text-sm">
            No active choices.<br />Select game odds on live feed to stack prediction slip.
          </div>
        ) : (
          slipSelections.map((sel, idx) => (
            <div key={idx} className="border border-[#222] bg-[#111] p-3 text-[11px] relative group hover:border-[#333]">
              <div className="flex justify-between mb-2">
                <span className="text-[#00FF41] font-bold uppercase tracking-widest text-[9px]">
                  Match Leg #{idx + 1}
                </span>
                <button
                  onClick={() => setSlipSelections(prev => prev.filter((_, s) => s !== idx))}
                  className="text-red-500 hover:text-red-300 transition-colors"
                  title="Remove Leg"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="font-bold text-white uppercase text-xs leading-tight">
                {sel.homeTeam} vs {sel.awayTeam}
              </div>
              <div className="mt-1 text-[#666] flex justify-between items-center">
                <span>Pick: <strong className="text-yellow-500">{sel.selection} Market</strong></span>
                <span className="text-[#00FF41] font-bold font-mono">@ {sel.odds.toFixed(2)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 bg-[#111] border-t-2 border-[#333] space-y-3.5 shrink-0">
        <div className="space-y-2 text-[11px]">
          <div className="flex justify-between items-center border-b border-[#222] pb-1.5">
            <span className="text-[#666] uppercase">Combined Odds</span>
            <span className="text-white font-bold leading-none">
              {slipSelections.length === 0 ? '0.00' : totalOdds.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#666] uppercase">Stake Input ($)</span>
            <div className="flex items-center gap-1.5 bg-black border border-[#333] px-2 py-1 rounded max-w-[110px]">
              <span className="text-[#555] font-bold">$</span>
              <input
                type="text"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                className="w-full bg-transparent text-right text-white focus:outline-none font-bold text-xs"
              />
            </div>
          </div>
        </div>

        {placeError && (
          <div className="p-2 border border-red-900 bg-red-950/40 text-red-400 text-[10px] rounded leading-tight flex items-start gap-1">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-500 mt-0.5" />
            <span>{placeError}</span>
          </div>
        )}

        {placeSuccess && (
          <div className="p-2 border border-[#00FF41] bg-[#00FF41]/10 text-[#00FF41] text-[10px] rounded leading-tight">
            {placeSuccess}
          </div>
        )}

        <div className="pt-2 border-t border-[#222]">
          <div className="flex justify-between items-end mb-3">
            <div className="text-[9px] text-[#666] uppercase leading-tight">
              SIM Potential<br />Reward Payout
            </div>
            <div className="text-xl md:text-2xl font-black text-[#00FF41] tracking-tight">
              ${potentialPayout.toFixed(2)}
            </div>
          </div>

          <button
            onClick={handlePlaceBet}
            disabled={slipSelections.length === 0 || placeBetMutation.isPending}
            className={`w-full font-black py-3.5 uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${
              slipSelections.length === 0 || placeBetMutation.isPending
                ? 'bg-[#1C1C1C] text-[#555] border border-[#222] cursor-not-allowed'
                : 'bg-[#00FF41] text-black hover:bg-[#00D135] active:scale-[0.98]'
            }`}
          >
            <Sparkles className="w-4 h-4" /> {placeBetMutation.isPending ? 'PROCESSING...' : 'PLACE_BET_SECURE'}
          </button>
        </div>
      </div>
    </>
  );
};
