import React from 'react';
import { Clock } from 'lucide-react';
import { Match, SelectionType } from '../types';
import { useBettingStore } from '../stores/bettingStore';

export const MatchCard: React.FC<{ match: Match }> = ({ match }) => {
  const { slipSelections, toggleSelection } = useBettingStore();
  const isSettled = match.status === 'Settled';

  const isSelected = (matchId: string, selectionType: SelectionType) => {
    return slipSelections.some(s => s.matchId === matchId && s.selection === selectionType);
  };

  const handleToggleSelection = (selectionType: SelectionType, odds: number) => {
    toggleSelection({
      matchId: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      selection: selectionType,
      odds: odds,
      overUnderValue: match.odds.overUnder
    });
  };

  return (
    <div className={`border-2 border-[#333] p-4 bg-[#0A0A0A] transition-all relative ${
      isSettled ? 'opacity-40 grayscale border-dashed' : 'hover:border-[#444]'
    }`}>
      {/* Match Header */}
      <div className="flex justify-between items-center mb-2 text-xs">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-[9px] font-bold uppercase ${
            match.sport === 'Football' ? 'bg-indigo-950 text-indigo-400' :
            match.sport === 'Basketball' ? 'bg-orange-950 text-[#FF8C00]' :
            'bg-emerald-950 text-emerald-400'
          }`}>
            {match.sport}
          </span>
          <span className="text-[#666] text-[10px] tracking-wider uppercase">Match ID: {match.id}</span>
        </div>

        {/* Status/Clock */}
        <div className="flex items-center gap-1.5 font-bold">
          {isSettled ? (
            <span className="text-[#666] uppercase">Settled</span>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping"></span>
              <span className="text-red-500 uppercase tracking-widest text-[10px] flex items-center gap-1">
                <Clock className="w-3 h-3" /> Live {match.currentMinute}'
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main Match Competitors & score */}
      <div className="flex justify-between items-center mb-4">
        <div className="space-y-1">
          <h3 className="text-base font-black text-white">{match.homeTeam}</h3>
          <h3 className="text-base font-black text-white">{match.awayTeam}</h3>
        </div>

        <div className="bg-[#111] px-4 py-2 border border-[#222] text-center rounded min-w-[70px]">
          <div className="text-[9px] text-[#555] tracking-widest uppercase">Score</div>
          <div className="text-xl font-bold font-mono tracking-wider text-[#00FF41]">
            {match.score.home} - {match.score.away}
          </div>
        </div>
      </div>

      {/* Markets Options (1X2 & Over/Under) */}
      {!isSettled ? (
        <div className="space-y-3 pt-2 border-t border-[#1C1C1C]">
          {/* 1X2 market */}
          <div>
            <div className="text-[10px] text-[#666] uppercase font-bold mb-1.5 tracking-wider">
              1X2 Full Time Result
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleToggleSelection('1', match.odds.homeWin)}
                className={`h-11 border flex flex-col items-center justify-center transition-all ${
                  isSelected(match.id, '1')
                    ? 'border-[#00FF41] bg-[#00FF41]/10 text-[#00FF41]'
                    : 'border-[#333] bg-[#111] hover:bg-[#161616] hover:border-[#555] text-white'
                }`}
              >
                <span className={`text-[9px] ${isSelected(match.id, '1') ? 'text-[#00FF41]' : 'text-[#666]'}`}>1 (Home)</span>
                <span className="text-xs font-bold">{match.odds.homeWin.toFixed(2)}</span>
              </button>
              
              <button
                onClick={() => handleToggleSelection('X', match.odds.draw)}
                className={`h-11 border flex flex-col items-center justify-center transition-all ${
                  isSelected(match.id, 'X')
                    ? 'border-[#00FF41] bg-[#00FF41]/10 text-[#00FF41]'
                    : 'border-[#333] bg-[#111] hover:bg-[#161616] hover:border-[#555] text-white'
                }`}
              >
                <span className={`text-[9px] ${isSelected(match.id, 'X') ? 'text-[#00FF41]' : 'text-[#666]'}`}>X (Draw)</span>
                <span className="text-xs font-bold">{match.odds.draw.toFixed(2)}</span>
              </button>

              <button
                onClick={() => handleToggleSelection('2', match.odds.awayWin)}
                className={`h-11 border flex flex-col items-center justify-center transition-all ${
                  isSelected(match.id, '2')
                    ? 'border-[#00FF41] bg-[#00FF41]/10 text-[#00FF41]'
                    : 'border-[#333] bg-[#111] hover:bg-[#161616] hover:border-[#555] text-white'
                }`}
              >
                <span className={`text-[9px] ${isSelected(match.id, '2') ? 'text-[#00FF41]' : 'text-[#666]'}`}>2 (Away)</span>
                <span className="text-xs font-bold">{match.odds.awayWin.toFixed(2)}</span>
              </button>
            </div>
          </div>

          {/* Goal Line Over/Under goals */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#111]">
            <div>
              <div className="text-[10px] text-[#666] uppercase mb-1 flex justify-between">
                <span>Goals Over {match.odds.overUnder}</span>
              </div>
              <button
                onClick={() => handleToggleSelection('Over', match.odds.overOdds)}
                className={`w-full h-10 border flex items-center justify-between px-3 transition-all ${
                  isSelected(match.id, 'Over')
                    ? 'border-[#00FF41] bg-[#00FF41]/10 text-[#00FF41]'
                    : 'border-[#222] bg-[#111] hover:bg-[#161616] text-white'
                }`}
              >
                <span className="text-[9px]" style={{ textTransform: 'uppercase' }}>Over {match.odds.overUnder}</span>
                <span className="text-xs font-bold font-mono">{match.odds.overOdds.toFixed(2)}</span>
              </button>
            </div>

            <div>
              <div className="text-[10px] text-[#666] uppercase mb-1 flex justify-between">
                <span>Goals Under {match.odds.overUnder}</span>
              </div>
              <button
                onClick={() => handleToggleSelection('Under', match.odds.underOdds)}
                className={`w-full h-10 border flex items-center justify-between px-3 transition-all ${
                  isSelected(match.id, 'Under')
                    ? 'border-[#00FF41] bg-[#00FF41]/10 text-[#00FF41]'
                    : 'border-[#222] bg-[#111] hover:bg-[#161616] text-white'
                }`}
              >
                <span className="text-[9px]" style={{ textTransform: 'uppercase' }}>Under {match.odds.overUnder}</span>
                <span className="text-xs font-bold font-mono">{match.odds.underOdds.toFixed(2)}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#111] p-2.5 border border-[#222] text-xs space-y-1.5 rounded">
          <div className="flex justify-between">
            <span className="text-[#64748B] uppercase">Result Settlement</span>
            <span className="text-[#00FF41] font-bold">1X2: [{match.result}]</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#64748B] uppercase">Total Goal Line ({match.odds.overUnder})</span>
            <span className="text-[#00FF41] font-bold">Outcome: [{match.overUnderResult}]</span>
          </div>
        </div>
      )}
    </div>
  );
};
