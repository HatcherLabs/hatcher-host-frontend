'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useRef, useEffect, useState, useCallback } from 'react';

export function WalletMultiButton() {
  const { connected, connecting, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fullAddr = publicKey?.toString() ?? '';
  const shortAddr = fullAddr
    ? `${fullAddr.slice(0, 4)}...${fullAddr.slice(-4)}`
    : null;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const handleCopy = useCallback(() => {
    if (!fullAddr) return;
    navigator.clipboard.writeText(fullAddr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback: select from a temporary textarea
      const ta = document.createElement('textarea');
      ta.value = fullAddr;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [fullAddr]);

  if (!connected) {
    return (
      <button
        onClick={() => setVisible(true)}
        disabled={connecting}
        className="h-9 px-4 text-white font-medium text-xs rounded-full border border-white/20 bg-transparent hover:bg-white/[0.04] transition-all duration-200 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
      >
        {connecting ? (
          <>
            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Connecting...
          </>
        ) : (
          'Connect Wallet'
        )}
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen((o) => !o)}
        aria-expanded={dropdownOpen}
        aria-haspopup="menu"
        className="h-9 px-3 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 transition-all duration-200"
      >
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
        <span className="font-mono text-xs text-green-400">{shortAddr}</span>
        <span className="text-xs ml-1" style={{ color: 'rgba(167,139,250,0.6)' }}>&#9662;</span>
      </button>

      {dropdownOpen && (
        <div
          className="absolute right-0 mt-1 w-48 rounded-xl shadow-xl z-50 overflow-hidden"
          style={{
            background: 'rgba(13, 11, 26, 0.95)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(46, 43, 74, 0.4)',
          }}
        >
          <button
            onClick={handleCopy}
            className="w-full text-left px-4 py-2.5 text-xs font-medium text-[#A5A1C2] hover:bg-white/[0.04] transition-colors duration-200 border-b border-white/[0.06]"
          >
            {copied ? 'Copied!' : 'Copy Address'}
          </button>
          <button
            onClick={() => { disconnect(); setDropdownOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors duration-200"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
