import React from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { fetchState } from './services/api';
import { Header } from './components/Header';
import { EventLog } from './components/EventLog';
import { AdminPanel } from './components/AdminPanel';
import { MarketFeed } from './components/MarketFeed';
import { BetSlip } from './components/BetSlip';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

function BettingApp() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['platformState'],
    queryFn: fetchState,
    refetchInterval: 2000, // Poll every 2 seconds automatically!
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] text-[#D1D1D1] flex items-center justify-center font-mono">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#00FF41] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="animate-pulse">Loading Simulation Engine...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#050505] text-red-500 flex items-center justify-center font-mono">
        <p>Fatal Error connecting to Engine Server.</p>
      </div>
    );
  }

  const { matches = [], wallet = { balance: 0, history: [] }, bets = [], events = [] } = data || {};

  return (
    <div id="full-app-container" className="min-h-screen bg-[#050505] text-[#D1D1D1] flex flex-col font-mono selection:bg-[#00FF41] selection:text-black">
      
      {/* HEADER SECTION */}
      <Header balance={wallet.balance} />

      {/* CORE LAYOUT GRID */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-visible">
        
        {/* COLUMN 1: EVENT_BUS LOGS AND ADMIN PANEL (3 cols on lg) */}
        <section className="order-3 lg:order-1 lg:col-span-3 border-t-2 lg:border-t-0 lg:border-r-2 border-[#333] flex flex-col bg-[#080808]">
          <EventLog events={events} />
          <AdminPanel matches={matches} />
        </section>

        {/* COLUMN 2: MARKET FEED AND TABS (6 cols on lg) */}
        <MarketFeed matches={matches} bets={bets} />

        {/* COLUMN 3: THE BET SLIP FACTORY (3 cols on lg) */}
        <section className="order-2 lg:order-3 lg:col-span-3 border-t-2 lg:border-t-0 lg:border-l-2 border-[#333] flex flex-col bg-[#0A0A0A]">
          <BetSlip walletBalance={wallet.balance} />
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BettingApp />
    </QueryClientProvider>
  );
}
