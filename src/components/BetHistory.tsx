import React from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Bet, Match } from '../types';

export const BetHistory: React.FC<{ bets: Bet[], matches: Match[] }> = ({ bets, matches }) => {
  if (bets.length === 0) {
    return (
      <div className="py-12 border-2 border-dashed border-[#222] text-center text-[#555] rounded">
        No betting tickets recorded yet. Book predictions in the live feed to start!
      </div>
    );
  }

  return (
    <>
      {bets.map((bet) => {
        const isWon = bet.status === 'Won';
        const isLost = bet.status === 'Lost';
        const isPending = bet.status === 'Pending';

        return (
          <div 
            key={bet.id}
            className={`border-2 p-4 bg-[#0A0A0A] ${
              isWon ? 'border-emerald-600/60 shadow-[0_0_8px_rgba(16,185,129,0.1)]' :
              isLost ? 'border-red-950/60' :
              'border-[#333]'
            }`}
          >
            <div className="flex justify-between items-center mb-3 border-b border-[#222] pb-2 text-[11px]">
              <div>
                <span className="text-[#94A3B8] font-bold uppercase mr-2 bg-[#1A1A1A] px-2 py-0.5">
                  {bet.type}
                </span>
                <span className="text-[#555]">ID: {bet.id}</span>
              </div>

              <div>
                {isWon && (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> WON
                  </span>
                )}
                {isLost && (
                  <span className="text-red-500 font-bold flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> LOST
                  </span>
                )}
                {isPending && (
                  <span className="text-yellow-500 font-bold flex items-center gap-1 animate-pulse">
                    <Clock className="w-3.5 h-3.5" /> PENDING
                  </span>
                )}
              </div>
            </div>

            {/* Multilegs or Singles display lists */}
            <div className="space-y-3 my-3">
              {bet.selections.map((sel, sIdx) => {
                const currentMatchState = matches.find(m => m.id === sel.matchId);
                const resolvedResult = currentMatchState?.status === 'Settled';
                
                return (
                  <div key={sIdx} className="text-xs flex justify-between items-center bg-[#111] p-2.5 border border-[#1A1A1A]">
                    <div>
                      <div className="text-[#64748B] text-[10px] uppercase font-mono">
                        {sel.homeTeam} vs {sel.awayTeam}
                      </div>
                      <div className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                        Choice: <span className="text-yellow-500 font-mono uppercase">{sel.selection}</span>
                        <span className="text-[#555]">@ {sel.odds.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="text-right text-[10px]">
                      {resolvedResult ? (
                        <span className="text-[#777] font-sans">Resolved</span>
                      ) : (
                        <span className="text-[#FF8C00] font-sans tracking-wide">Live</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stakes/Returns info */}
            <div className="pt-2.5 border-t border-[#1C1C1C] flex justify-between items-end text-xs font-mono">
              <div>
                <span className="text-[#666] tracking-wider uppercase">Stake</span>
                <div className="font-bold text-white">${bet.stake.toFixed(2)}</div>
              </div>

              <div className="text-right">
                <span className="text-[#666] tracking-wider uppercase">
                  {isWon ? 'Payout Received' : 'Est. Potential Payout'}
                </span>
                <div className={`font-black text-lg ${isWon ? 'text-[#00FF41]' : 'text-stone-400'}`}>
                  ${bet.potentialPayout.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};
