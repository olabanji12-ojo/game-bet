import React from 'react';
import { Activity } from 'lucide-react';
import { SystemEvent } from '../types';

export const EventLog: React.FC<{ events: SystemEvent[] }> = ({ events }) => {
  return (
    <>
      <div className="p-4 border-b border-[#333] flex items-center justify-between bg-[#0A0A0A]">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-[#00FF41]" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#888]">Event_Bus.log</h2>
        </div>
        <span className="text-[9px] animate-pulse text-[#00FF41] flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00FF41]"></span> LIVE FEED
        </span>
      </div>

      <div className="flex-1 p-4 max-h-[350px] lg:max-h-none overflow-y-auto font-mono text-[11px] leading-relaxed space-y-3 custom-scrollbar divide-y divide-[#1A1A1A]">
        {events.length === 0 ? (
          <div className="text-[#555] italic text-center py-8">
            Listening on event bus... Ticks/fluctuations will trigger shortly.
          </div>
        ) : (
          events.map((evt) => {
            const date = new Date(evt.timestamp);
            const timeStr = date.toTimeString().split(' ')[0];
            return (
              <div key={evt.id} className="pt-2">
                <div className="text-[#666] flex justify-between gap-1 text-[10px]">
                  <span>[{timeStr}]</span>
                  <span className="text-[#00FF41] uppercase">{evt.type}</span>
                </div>

                {evt.type === 'ODDS_UPDATED' && (
                  <div className="text-white">
                    Match <span className="text-yellow-500 font-bold">{evt.payload.matchId}</span> odds shifted: Minute <span className="text-[#00FF41]">{evt.payload.currentMinute}'</span>, score: {evt.payload.score.home}-{evt.payload.score.away}
                  </div>
                )}

                {evt.type === 'BET_PLACED' && (
                  <div className="text-white">
                    Authorized {evt.payload.type} Bet: Stake <span className="text-[#00FF41]">${evt.payload.stake}</span> (Payout ${evt.payload.potentialPayout})
                  </div>
                )}

                {evt.type === 'GAME_CONCLUDED' && (
                  <span className="text-yellow-400 font-bold">
                    GAME_SETTLED: {evt.payload.homeTeam} {evt.payload.score.home}-{evt.payload.score.away} {evt.payload.awayTeam} (Result: {evt.payload.result})
                  </span>
                )}

                {evt.type === 'BET_SETTLED' && (
                  <span className="text-[#00FF41] font-semibold">
                    BET_STRIKE_S_SETTLED: {evt.payload.id} status is now {evt.payload.status}!
                  </span>
                )}

                {evt.type === 'WALLET_UPDATED' && (
                  <div className="text-[#777] italic text-[9px]">
                    PLAY balance sync: ${evt.payload.balance.toFixed(2)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
};
