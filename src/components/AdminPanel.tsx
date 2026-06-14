import React, { useState, FormEvent } from 'react';
import { Sliders, DollarSign } from 'lucide-react';
import { Match } from '../types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSettle, depositWalletCustom } from '../services/api';

export const AdminPanel: React.FC<{ matches: Match[] }> = ({ matches }) => {
  const queryClient = useQueryClient();
  
  // Admin Settle panel states
  const [adminMatchId, setAdminMatchId] = useState<string>('');
  const [adminResult, setAdminResult] = useState<'1' | 'X' | '2'>('1');
  const [adminOverUnder, setAdminOverUnder] = useState<'Over' | 'Under'>('Over');
  const [adminHomeScore, setAdminHomeScore] = useState<number>(2);
  const [adminAwayScore, setAdminAwayScore] = useState<number>(1);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Deposit states
  const [customDeposit, setCustomDeposit] = useState<string>('500.00');
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositSuccess, setDepositSuccess] = useState<string | null>(null);

  const settleMutation = useMutation({
    mutationFn: (data: any) => adminSettle(data.matchId, data.result, data.overUnderResult, data.score.home, data.score.away),
    onSuccess: (data, variables) => {
      setAdminMessage(`Succesfully settled match ${variables.matchId}! PubSub Settle events sent.`);
      setTimeout(() => setAdminMessage(null), 5000);
      queryClient.invalidateQueries({ queryKey: ['platformState'] });
    },
    onError: (err: Error) => setAdminError(err.message)
  });

  const depositMutation = useMutation({
    mutationFn: depositWalletCustom,
    onSuccess: (_, variables) => {
      setDepositSuccess(`Transact Success! Simulated $${variables.toFixed(2)} added to active playground balance.`);
      setTimeout(() => setDepositSuccess(null), 5000);
      queryClient.invalidateQueries({ queryKey: ['platformState'] });
    },
    onError: (err: Error) => setDepositError(err.message)
  });

  // Auto-set first active match for admin dropdown if not set
  React.useEffect(() => {
    const firstActive = matches.find((m) => m.status === 'Active');
    if (firstActive && !adminMatchId) {
      setAdminMatchId(firstActive.id);
    }
  }, [matches, adminMatchId]);

  const handleAdminSettle = (e: FormEvent) => {
    e.preventDefault();
    setAdminMessage(null);
    setAdminError(null);
    if (!adminMatchId) {
      setAdminError('Please select a match to settle.');
      return;
    }
    settleMutation.mutate({
      matchId: adminMatchId,
      result: adminResult,
      overUnderResult: adminOverUnder,
      score: { home: adminHomeScore, away: adminAwayScore }
    });
  };

  const handleDepositWalletCustom = (e: FormEvent) => {
    e.preventDefault();
    setDepositError(null);
    setDepositSuccess(null);
    const numericAmount = parseFloat(customDeposit);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setDepositError('Please input a valid positive simulated credit amount.');
      return;
    }
    depositMutation.mutate(numericAmount);
  };

  return (
    <div className="p-4 border-t-2 border-[#333] bg-[#0A0A0A] space-y-4">
      <h3 className="text-xs font-black uppercase text-[#888] flex items-center gap-1.5">
        <Sliders className="w-3.5 h-3.5 text-white" /> Manual Settle Tool
      </h3>
      
      <form onSubmit={handleAdminSettle} className="space-y-2.5 text-xs">
        <div>
          <label className="block text-[10px] uppercase text-[#666] mb-1">Target Match</label>
          <select 
            value={adminMatchId}
            onChange={(e) => {
              setAdminMatchId(e.target.value);
              const selected = matches.find(m => m.id === e.target.value);
              if (selected) {
                setAdminHomeScore(selected.score.home);
                setAdminAwayScore(selected.score.away);
              }
            }}
            className="w-full bg-[#111] border border-[#333] p-1.5 text-white rounded text-xs focus:ring-1 focus:ring-[#00FF41]"
          >
            <option value="">-- Choose Live Match --</option>
            {matches.map(m => (
              <option key={m.id} value={m.id}>
                [{m.sport}] {m.homeTeam} vs {m.awayTeam} ({m.status})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] uppercase text-[#666] mb-1">Outcome</label>
            <select 
              value={adminResult}
              onChange={(e) => setAdminResult(e.target.value as any)}
              className="w-full bg-[#111] border border-[#333] p-1.5 text-white rounded text-[#00FF41] font-bold"
            >
              <option value="1">1 (Home Win)</option>
              <option value="X">X (Draw)</option>
              <option value="2">2 (Away Win)</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase text-[#666] mb-1">Over/Under (2.5)</label>
            <select 
              value={adminOverUnder}
              onChange={(e) => setAdminOverUnder(e.target.value as any)}
              className="w-full bg-[#111] border border-[#333] p-1.5 text-white rounded"
            >
              <option value="Over">Over 2.5</option>
              <option value="Under">Under 2.5</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] uppercase text-[#666] mb-1">Home Score</label>
            <input 
              type="number"
              min="0"
              value={adminHomeScore}
              onChange={(e) => setAdminHomeScore(parseInt(e.target.value) || 0)}
              className="w-full bg-[#111] border border-[#333] p-1.5 text-white rounded text-center"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase text-[#666] mb-1">Away Score</label>
            <input 
              type="number"
              min="0"
              value={adminAwayScore}
              onChange={(e) => setAdminAwayScore(parseInt(e.target.value) || 0)}
              className="w-full bg-[#111] border border-[#333] p-1.5 text-white rounded text-center"
            />
          </div>
        </div>

        {adminError && <div className="p-2 border border-red-900 bg-red-950/40 text-red-400 text-[10px] rounded leading-tight">{adminError}</div>}
        {adminMessage && <div className="p-2 border border-[#00FF41] bg-[#00FF41]/10 text-[#00FF41] text-[10px] rounded leading-tight">{adminMessage}</div>}

        <button 
          type="submit"
          disabled={settleMutation.isPending}
          className="w-full bg-[#1A1A1A] border border-[#333] py-2 text-xs font-bold hover:bg-[#222] hover:text-white hover:border-[#00FF41] transition-all tracking-wider text-[#00FF41]"
        >
          {settleMutation.isPending ? 'PROCESSING...' : 'PROMPT_SETTLEMENT'}
        </button>
      </form>

      <div className="h-px bg-[#222] my-4"></div>

      {/* Simulated Deposit Tool */}
      <h3 className="text-xs font-black uppercase text-[#888] flex items-center gap-1.5">
        <DollarSign className="w-3.5 h-3.5 text-white" /> Play Credits Top-Up
      </h3>
      
      <form onSubmit={handleDepositWalletCustom} className="space-y-2 text-xs">
        <div>
          <label className="block text-[10px] uppercase text-[#666] mb-1">Deposit Amount ($)</label>
          <div className="flex gap-1.5">
            <input 
              type="text"
              value={customDeposit}
              onChange={(e) => setCustomDeposit(e.target.value)}
              placeholder="500.00"
              className="flex-1 bg-[#111] border border-[#333] p-1.5 text-white rounded text-xs focus:outline-none focus:border-[#00FF41] font-bold"
            />
            <button
              type="submit"
              disabled={depositMutation.isPending}
              className="bg-[#00FF41] hover:bg-[#00D135] text-black font-black px-3 py-1.5 rounded text-xs transition-colors"
            >
              DEPOSIT
            </button>
          </div>
        </div>
        
        {depositError && <div className="p-2 border border-red-900 bg-red-950/40 text-red-400 text-[10px] rounded leading-tight">{depositError}</div>}
        {depositSuccess && <div className="p-2 border border-[#00FF41] bg-[#00FF41]/10 text-[#00FF41] text-[10px] rounded leading-tight">{depositSuccess}</div>}
      </form>
    </div>
  );
};
