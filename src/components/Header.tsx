import React from 'react';
import { RotateCcw, Coins } from 'lucide-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { resetWallet } from '../services/api';

export const Header: React.FC<{ balance: number }> = ({ balance }) => {
  const queryClient = useQueryClient();

  const resetMutation = useMutation({
    mutationFn: resetWallet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platformState'] });
    }
  });

  return (
    <header className="h-16 border-b-2 border-[#333] flex items-center justify-between px-6 bg-[#0A0A0A] shrink-0 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <div className="w-3 h-3 bg-[#00FF41] rounded-full animate-pulse shadow-[0_0_8px_#00FF41]"></div>
        <div>
          <h1 className="text-xl font-black tracking-tighter text-white flex items-center gap-2">
            BANJI'S GAME NIGHT <span className="text-xs font-normal text-[#666] bg-[#111] px-2 py-0.5 border border-[#222]">Prototype</span>
          </h1>
        </div>
        <span className="hidden md:inline text-[10px] text-[#666] border border-[#333] px-2 py-0.5">
          ENGINE: CUSTOM
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
            ${balance.toFixed(2)}
            <span className="text-[10px] font-normal text-black bg-[#00FF41] px-1 py-px font-sans rounded">PLAY</span>
          </div>
        </div>

        <button 
          onClick={() => resetMutation.mutate()}
          disabled={resetMutation.isPending}
          title="Reset Wallet Balance to $1,000 Play Credits"
          className="p-2 border border-[#333] bg-[#111] hover:bg-[#222] hover:border-[#00FF41] text-[#D1D1D1] hover:text-white transition-colors"
        >
          <RotateCcw className={`w-4 h-4 ${resetMutation.isPending ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </header>
  );
};
