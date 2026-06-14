import React, { useMemo } from 'react';
import { Match, Bet } from '../types';
import { useBettingStore } from '../stores/bettingStore';
import { MatchCard } from './MatchCard';
import { BetHistory } from './BetHistory';

export const MarketFeed: React.FC<{ matches: Match[], bets: Bet[] }> = ({ matches, bets }) => {
  const { selectedSport, setSelectedSport, activeTab, setActiveTab } = useBettingStore();
  const sports = ['All', 'Football', 'Basketball', 'Tennis'];

  const filteredMatches = useMemo(() => {
    if (selectedSport === 'All') return matches;
    return matches.filter(m => m.sport.toLowerCase() === selectedSport.toLowerCase());
  }, [matches, selectedSport]);

  return (
    <section className="order-1 lg:order-2 lg:col-span-6 flex flex-col p-4 md:p-6 overflow-hidden bg-[#050505]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-black italic tracking-tighter text-white flex items-center gap-2">
            MARKET_FEED.
          </h2>
          <p className="text-xs text-[#666] mt-1 uppercase">Live prices simulated dynamically via background tick service</p>
        </div>

        {/* SPORT SELECTOR */}
        <div className="flex flex-wrap gap-1 bg-[#0F0F0F] p-1 border border-[#222]">
          {sports.map((sport) => (
            <button
              key={sport}
              onClick={() => setSelectedSport(sport)}
              className={`px-3 py-1 text-[10px] font-bold uppercase transition-all ${
                selectedSport === sport
                  ? 'bg-white text-black'
                  : 'text-[#888] hover:text-white hover:bg-[#1A1A1A]'
              }`}
            >
              {sport}
            </button>
          ))}
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-[#333] mb-4">
        <button
          onClick={() => setActiveTab('Feed')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-t-2 border-x transition-colors ${
            activeTab === 'Feed'
              ? 'border-t-[#00FF41] border-x-[#333] bg-[#0A0A0A] text-white'
              : 'border-t-transparent border-x-transparent text-[#666] hover:text-white'
          }`}
        >
          Live Markets
        </button>
        <button
          onClick={() => setActiveTab('History')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-t-2 border-x transition-colors flex items-center gap-2 ${
            activeTab === 'History'
              ? 'border-t-[#00FF41] border-x-[#333] bg-[#0A0A0A] text-white'
              : 'border-t-transparent border-x-transparent text-[#666] hover:text-white'
          }`}
        >
          My Bets ({bets.length})
        </button>
      </div>

      {activeTab === 'Feed' && (
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {filteredMatches.length === 0 ? (
            <div className="py-12 border-2 border-dashed border-[#222] text-center text-[#555] rounded">
              No matches matched current filters. All completed matches move to History.
            </div>
          ) : (
            filteredMatches.map((match) => <MatchCard key={match.id} match={match} />)
          )}
        </div>
      )}

      {activeTab === 'History' && (
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          <BetHistory bets={bets} matches={matches} />
        </div>
      )}
    </section>
  );
};
