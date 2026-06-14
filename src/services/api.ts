import { Match, Wallet, Bet, SystemEvent, BetSelection } from '../types';

export const fetchState = async (): Promise<{ matches: Match[], wallet: Wallet, bets: Bet[], events: SystemEvent[] }> => {
  const res = await fetch('/api/state');
  if (!res.ok) throw new Error('Failed to retrieve simulated platform state.');
  return res.json();
};

export const placeBet = async (type: 'Single' | 'Accumulator', selections: BetSelection[], stake: number) => {
  const response = await fetch('/api/bets/place', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, selections, stake })
  });
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Betting controller rejected layout constraints.');
  }
  return result;
};

export const resetWallet = async () => {
  const res = await fetch('/api/wallet/reset', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset wallet.');
  return res.json();
};

export const depositWalletCustom = async (amount: number) => {
  const response = await fetch('/api/wallet/deposit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount })
  });
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Server rejected deposit sequence.');
  }
  return result;
};

export const adminSettle = async (matchId: string, result: '1'|'X'|'2', overUnderResult: 'Over'|'Under', home: number, away: number) => {
  const payload = { matchId, result, overUnderResult, score: { home, away } };
  const response = await fetch('/api/admin/settle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const resJson = await response.json();
  if (!response.ok || !resJson.success) {
    throw new Error(resJson.error || 'Settlement failed to process.');
  }
  return resJson;
};
