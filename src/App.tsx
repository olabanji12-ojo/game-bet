import React, { useEffect, useState, useMemo, FormEvent } from 'react';
import {
  Match,
  Bet,
  Wallet,
  SystemEvent,
  BetSelection,
  SelectionType,
  Score
} from './types';
import { 
  Play, 
  RotateCcw, 
  Trash2, 
  Coins, 
  Activity, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  LayoutGrid,
  ChevronRight,
  Sliders,
  DollarSign
} from 'lucide-react';

export default function App() {
  // Sync States
  const [matches, setMatches] = useState<Match[]>([]);
  const [wallet, setWallet] = useState<Wallet>({ balance: 1000, history: [] });
  const [bets, setBets] = useState<Bet[]>([]);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  
  // App States
  const [selectedSport, setSelectedSport] = useState<string>('All');
  const [betType, setBetType] = useState<'Single' | 'Accumulator'>('Accumulator');
  const [slipSelections, setSlipSelections] = useState<BetSelection[]>([]);
  const [stake, setStake] = useState<string>('50.00');
  const [activeTab, setActiveTab] = useState<'Feed' | 'History'>('Feed');
  const [customDeposit, setCustomDeposit] = useState<string>('500.00');
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositSuccess, setDepositSuccess] = useState<string | null>(null);
  
  // Admin Settle panel states
  const [adminMatchId, setAdminMatchId] = useState<string>('');
  const [adminResult, setAdminResult] = useState<'1' | 'X' | '2'>('1');
  const [adminOverUnder, setAdminOverUnder] = useState<'Over' | 'Under'>('Over');
  const [adminHomeScore, setAdminHomeScore] = useState<number>(2);
  const [adminAwayScore, setAdminAwayScore] = useState<number>(1);

  const [loading, setLoading] = useState<boolean>(true);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [placeSuccess, setPlaceSuccess] = useState<string | null>(null);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Poll state on mount and every 2 seconds
  const fetchState = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch('/api/state');
      if (!res.ok) throw new Error('Failed to retrieve simulated platform state.');
      const data = await res.json();
      setMatches(data.matches || []);
      setWallet(data.wallet || { balance: 0, history: [] });
      setBets(data.bets || []);
      setEvents(data.events || []);
      
      // Auto-set first active match for admin dropdown if not set
      const firstActive = (data.matches || []).find((m: Match) => m.status === 'Active');
      if (firstActive && !adminMatchId) {
        setAdminMatchId(firstActive.id);
      }
    } catch (err) {
      console.error('[App] Error pulling backend state:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(() => {
      fetchState(true);
    }, 2000);
    return () => clearInterval(interval);
  }, [adminMatchId]);

  // Handle odds click to add/toggle selection in slip
  const handleToggleSelection = (match: Match, selectionType: SelectionType, odds: number) => {
    setPlaceError(null);
    setPlaceSuccess(null);
    
    // Check if selection already in slip
    const existingIndex = slipSelections.findIndex(
      s => s.matchId === match.id && s.selection === selectionType
    );

    if (existingIndex > -1) {
      // Remove it
      setSlipSelections(prev => prev.filter((_, idx) => idx !== existingIndex));
    } else {
      // Create and append
      const newSelection: BetSelection = {
        matchId: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        selection: selectionType,
        odds: odds,
        overUnderValue: match.odds.overUnder
      };
      
      // Real-world Multi-bet validation rule: can't pick multiple outcomes of same match in an Accumulator
      if (betType === 'Accumulator') {
        const matchesInSlip = slipSelections.map(s => s.matchId);
        if (matchesInSlip.includes(match.id)) {
          // Replace previous selection for this match with the new selection
          setSlipSelections(prev => prev.filter(s => s.matchId !== match.id).concat(newSelection));
          return;
        }
      }

      setSlipSelections(prev => [...prev, newSelection]);
    }
  };

  // Check if a selection is active
  const isSelected = (matchId: string, selectionType: SelectionType) => {
    return slipSelections.some(s => s.matchId === matchId && s.selection === selectionType);
  };

  // Sports list helper
  const sports = ['All', 'Football', 'Basketball', 'Tennis'];
  const filteredMatches = useMemo(() => {
    if (selectedSport === 'All') return matches;
    return matches.filter(m => m.sport.toLowerCase() === selectedSport.toLowerCase());
  }, [matches, selectedSport]);

  // Bet calculation using factory contract values retrieved in UI
  const totalOdds = useMemo(() => {
    if (slipSelections.length === 0) return 0;
    if (betType === 'Single') {
      // Average odds
      const sum = slipSelections.reduce((acc, curr) => acc + curr.odds, 0);
      return sum / slipSelections.length;
    } else {
      // Multiplier
      return slipSelections.reduce((acc, curr) => acc * curr.odds, 1);
    }
  }, [slipSelections, betType]);

  const potentialPayout = useMemo(() => {
    const numericStake = parseFloat(stake) || 0;
    if (numericStake <= 0 || slipSelections.length === 0) return 0;
    if (betType === 'Single') {
      // Distributed payout: stake splits equally amongst all single predictions
      let totalPayout = 0;
      const distributedStake = numericStake / slipSelections.length;
      slipSelections.forEach(s => {
        totalPayout += distributedStake * s.odds;
      });
      return totalPayout;
    } else {
      return numericStake * totalOdds;
    }
  }, [slipSelections, betType, stake, totalOdds]);

  // Submit bet
  const handlePlaceBet = async () => {
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

    if (wallet.balance < numericStake) {
      setPlaceError('Insufficient playground balance to authorize this transaction.');
      return;
    }

    if (betType === 'Accumulator' && slipSelections.length < 2) {
      setPlaceError('Accumulators require a minimum of 2 separate matches.');
      return;
    }

    try {
      const response = await fetch('/api/bets/place', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: betType,
          selections: slipSelections,
          stake: numericStake
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Betting controller rejected layout constraints.');
      }

      setPlaceSuccess(`Tx Authorized! Bet placed successfully.`);
      setSlipSelections([]);
      fetchState(true);
    } catch (err) {
      setPlaceError((err as Error).message);
    }
  };

  // Reset Wallet Play Money
  const handleResetWallet = async () => {
    try {
      const res = await fetch('/api/wallet/reset', { method: 'POST' });
      if (res.ok) {
        fetchState(true);
      }
    } catch (err) {
      console.error('Wallet reset error:', err);
    }
  };

  const handleDepositWalletCustom = async (e: FormEvent) => {
    e.preventDefault();
    setDepositError(null);
    setDepositSuccess(null);

    const numericAmount = parseFloat(customDeposit);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setDepositError('Please input a valid positive simulated credit amount.');
      return;
    }

    try {
      const response = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: numericAmount })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Server rejected deposit sequence.');
      }

      setDepositSuccess(`Transact Success! Simulated $${numericAmount.toFixed(2)} added to active playground balance.`);
      setTimeout(() => {
        setDepositSuccess(null);
      }, 5000);
      fetchState(true);
    } catch (err) {
      setDepositError((err as Error).message);
    }
  };

  // Settle Match Manually (Admin control)
  const handleAdminSettle = async (e: FormEvent) => {
    e.preventDefault();
    setAdminMessage(null);
    setAdminError(null);

    if (!adminMatchId) {
      setAdminError('Please select a match to settle.');
      return;
    }

    const payload = {
      matchId: adminMatchId,
      result: adminResult,
      overUnderResult: adminOverUnder,
      score: {
        home: adminHomeScore,
        away: adminAwayScore
      }
    };

    try {
      const response = await fetch('/api/admin/settle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const resJson = await response.json();
      if (!response.ok || !resJson.success) {
        throw new Error(resJson.error || 'Settlement failed to process.');
      }

      setAdminMessage(`Succesfully settled match ${adminMatchId}! PubSub Settle events sent.`);
      // Auto-focus next active match
      setTimeout(() => {
        setAdminMessage(null);
      }, 5000);
      fetchState(true);
    } catch (err) {
      setAdminError((err as Error).message);
    }
  };

  return (
    <div id="full-app-container" className="min-h-screen bg-[#050505] text-[#D1D1D1] flex flex-col font-mono selection:bg-[#00FF41] selection:text-black">
      
      {/* HEADER SECTION */}
      <header className="h-16 border-b-2 border-[#333] flex items-center justify-between px-6 bg-[#0A0A0A] shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 bg-[#00FF41] rounded-full animate-pulse shadow-[0_0_8px_#00FF41]"></div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white flex items-center gap-2">
              SIM_BET.ARCH <span className="text-xs font-normal text-[#666] bg-[#111] px-2 py-0.5 border border-[#222]">v1.0.4</span>
            </h1>
          </div>
          <span className="hidden md:inline text-[10px] text-[#666] border border-[#333] px-2 py-0.5">
            ENV: PLAYG_COLLATER_SIM
          </span>
        </div>

        <div className="flex gap-4 md:gap-8 items-center">
          <div className="hidden sm:block text-right">
            <div className="text-[9px] text-[#666] uppercase">SYSTEM LATENCY</div>
            <div className="text-xs text-[#00FF41] font-bold">1.24ms</div>
          </div>
          <div className="hidden sm:block h-10 w-px bg-[#333]"></div>

          <div className="text-right">
            <div className="text-[10px] text-[#888] uppercase tracking-wider flex items-center gap-1 justify-end">
              <Coins className="w-3 h-3 text-[#00FF41]" /> WALLET BALANCE
            </div>
            <div className="text-lg md:text-xl font-bold text-white flex items-center gap-2 justify-end">
              ${wallet.balance.toFixed(2)}
              <span className="text-[10px] font-normal text-black bg-[#00FF41] px-1 py-px font-sans rounded">PLAY</span>
            </div>
          </div>

          <button 
            onClick={handleResetWallet}
            title="Reset Wallet Balance to $1,000 Play Credits"
            className="p-2 border border-[#333] bg-[#111] hover:bg-[#222] hover:border-[#00FF41] text-[#D1D1D1] hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* CORE LAYOUT GRID */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-visible">
        
        {/* COLUMN 1: EVENT_BUS LOGS (3 cols on lg) */}
        <section className="order-3 lg:order-1 lg:col-span-3 border-t-2 lg:border-t-0 lg:border-r-2 border-[#333] flex flex-col bg-[#080808]">
          <div className="p-4 border-b border-[#333] flex items-center justify-between bg-[#0A0A0A]">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-[#00FF41]" />
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#888]">Event_Bus.log</h2>
            </div>
            <span className="text-[9px] animate-pulse text-[#00FF41] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF41]"></span> LIVE FEED
            </span>
          </div>

          {/* EVENTS LIST */}
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

          {/* SIMULATOR CONTROLS & INFO */}
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
                className="w-full bg-[#1A1A1A] border border-[#333] py-2 text-xs font-bold hover:bg-[#222] hover:text-white hover:border-[#00FF41] transition-all tracking-wider text-[#00FF41]"
              >
                PROMPT_SETTLEMENT
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
        </section>

        {/* COLUMN 2: MARKET FEED AND TABS (6 cols on lg) */}
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

          {/* TABS (Live Markets vs. Placed Bets History) */}
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

          {/* TAB CONTENT 1: FEED */}
          {activeTab === 'Feed' && (
            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              
              {filteredMatches.length === 0 ? (
                <div className="py-12 border-2 border-dashed border-[#222] text-center text-[#555] rounded">
                  No matches matched current filters. All completed matches move to History.
                </div>
              ) : (
                filteredMatches.map((match) => {
                  const isSettled = match.status === 'Settled';
                  return (
                    <div 
                      key={match.id} 
                      className={`border-2 border-[#333] p-4 bg-[#0A0A0A] transition-all relative ${
                        isSettled ? 'opacity-40 grayscale border-dashed' : 'hover:border-[#444]'
                      }`}
                    >
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
                              {/* 1 */}
                              <button
                                onClick={() => handleToggleSelection(match, '1', match.odds.homeWin)}
                                className={`h-11 border flex flex-col items-center justify-center transition-all ${
                                  isSelected(match.id, '1')
                                    ? 'border-[#00FF41] bg-[#00FF41]/10 text-[#00FF41]'
                                    : 'border-[#333] bg-[#111] hover:bg-[#161616] hover:border-[#555] text-white'
                                }`}
                              >
                                <span className={`text-[9px] ${isSelected(match.id, '1') ? 'text-[#00FF41]' : 'text-[#666]'}`}>1 (Home)</span>
                                <span className="text-xs font-bold">{match.odds.homeWin.toFixed(2)}</span>
                              </button>
                              
                              {/* Draw */}
                              <button
                                onClick={() => handleToggleSelection(match, 'X', match.odds.draw)}
                                className={`h-11 border flex flex-col items-center justify-center transition-all ${
                                  isSelected(match.id, 'X')
                                    ? 'border-[#00FF41] bg-[#00FF41]/10 text-[#00FF41]'
                                    : 'border-[#333] bg-[#111] hover:bg-[#161616] hover:border-[#555] text-white'
                                }`}
                              >
                                <span className={`text-[9px] ${isSelected(match.id, 'X') ? 'text-[#00FF41]' : 'text-[#666]'}`}>X (Draw)</span>
                                <span className="text-xs font-bold">{match.odds.draw.toFixed(2)}</span>
                              </button>

                              {/* 2 */}
                              <button
                                onClick={() => handleToggleSelection(match, '2', match.odds.awayWin)}
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
                                onClick={() => handleToggleSelection(match, 'Over', match.odds.overOdds)}
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
                                onClick={() => handleToggleSelection(match, 'Under', match.odds.underOdds)}
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
                })
              )}
            </div>
          )}

          {/* TAB CONTENT 2: MY PLACED BETS HISTORY */}
          {activeTab === 'History' && (
            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              
              {bets.length === 0 ? (
                <div className="py-12 border-2 border-dashed border-[#222] text-center text-[#555] rounded">
                  No betting tickets recorded yet. Book predictions in the live feed to start!
                </div>
              ) : (
                bets.map((bet) => {
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
                })
              )}
            </div>
          )}

        </section>

        {/* COLUMN 3: THE BET SLIP FACTORY (3 cols on lg) */}
        <section className="order-2 lg:order-3 lg:col-span-3 border-t-2 lg:border-t-0 lg:border-l-2 border-[#333] flex flex-col bg-[#0A0A0A]">
          
          <div className="p-4 bg-white text-black shrink-0 flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" /> Bet_Slip.Factory
            </h2>
            {slipSelections.length > 0 && (
              <button 
                onClick={() => setSlipSelections([])}
                className="text-[10px] text-red-600 hover:text-red-950 font-bold uppercase underline"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="p-4 bg-[#0F0F0F] border-b border-[#222]">
            {/* Bet Type Switcher */}
            <div className="grid grid-cols-2 gap-1 bg-black p-0.5 border border-[#333] rounded">
              <button
                type="button"
                onClick={() => {
                  setBetType('Single');
                  setPlaceError(null);
                }}
                className={`py-1.5 text-[10px] font-bold uppercase transition-all rounded ${
                  betType === 'Single'
                    ? 'bg-[#1A1A1A] text-[#00FF41] border border-[#333]'
                    : 'text-[#666] hover:text-white'
                }`}
              >
                Single Bets
              </button>
              <button
                type="button"
                onClick={() => {
                  setBetType('Accumulator');
                  setPlaceError(null);
                }}
                className={`py-1.5 text-[10px] font-bold uppercase transition-all rounded ${
                  betType === 'Accumulator'
                    ? 'bg-[#1A1A1A] text-[#00FF41] border border-[#333]'
                    : 'text-[#666] hover:text-white'
                }`}
              >
                Accumulator
              </button>
            </div>
          </div>

          {/* ACTIVE SELECTION CARDS */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[300px] lg:max-h-none">
            {slipSelections.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#555] py-8 font-serif italic text-sm">
                No active choices.<br />
                Select game odds on live feed to stack prediction slip.
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

          {/* BET ACTION SUBMIT DRAWER */}
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

            {/* ERROR / SUCCESS BANNERS */}
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
                disabled={slipSelections.length === 0}
                className={`w-full font-black py-3.5 uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${
                  slipSelections.length === 0
                    ? 'bg-[#1C1C1C] text-[#555] border border-[#222] cursor-not-allowed'
                    : 'bg-[#00FF41] text-black hover:bg-[#00D135] active:scale-[0.98]'
                }`}
              >
                <Sparkles className="w-4 h-4" /> PLACE_BET_SECURE
              </button>
            </div>
          </div>
        </section>

      </div>

      {/* FOOTER STATS */}
      <footer className="h-8 border-t border-[#333] bg-[#050505] flex items-center justify-between px-6 text-[9px] uppercase tracking-widest text-[#444] shrink-0">
        <div>SOCKET_CONNECTED: PROTO_OK</div>
        <div className="hidden sm:block">TX_BLOCK_HASH: 0x8df...29ca71b</div>
        <div>© 2026 ARCH_SYSTEMS PROTOTYPE LAYER</div>
      </footer>
    </div>
  );
}
