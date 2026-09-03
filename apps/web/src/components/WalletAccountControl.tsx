import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Wallet, X } from "lucide-react";
import { subscribeWalletConnection, trustWalletDappLink, walletHandlers, type DiscoveredWallet, type WalletSession } from "../services/walletHandlers";

export function WalletAccountControl({ onFallback }: { onFallback: () => void }) {
  const [session, setSession] = useState<WalletSession | undefined>(() => walletHandlers.getSession());
  const [wallets, setWallets] = useState<DiscoveredWallet[]>(() => walletHandlers.getWallets());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => subscribeWalletConnection((snapshot) => {
    setSession(snapshot.session);
    setWallets(snapshot.wallets);
  }), []);

  const label = session ? `${session.address.slice(0, 6)}…${session.address.slice(-4)}` : "Connect Wallet";
  const mobileLink = useMemo(() => trustWalletDappLink(), [pickerOpen]);

  async function connect(walletId?: string) {
    setBusy(true);
    setError(undefined);
    try {
      await walletHandlers.connectWallet(walletId);
      setPickerOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Wallet connection failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setError(undefined);
          if (session) {
            setPickerOpen((value) => !value);
            return;
          }
          if (wallets.length === 1) await connect(wallets[0].id);
          else setPickerOpen(true);
        }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#1c2433] border border-white/8 hover:border-white/14 disabled:opacity-60 transition-colors text-sm text-[#9aacc4]"
        aria-label={session ? `Connected wallet ${session.address}. Open wallet menu.` : "Connect wallet"}
      >
        <Wallet className="w-3.5 h-3.5" />
        <span className="sm:hidden text-[11px]">{busy ? "Connecting…" : session ? label : "Connect"}</span>
        <span className="hidden sm:block text-xs">{busy ? "Connecting…" : label}</span>
      </button>

      {pickerOpen && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-lg border border-white/10 bg-[#151b26] p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-white">{session ? "Connected wallet" : "Choose wallet"}</div>
              <div className="text-[10px] text-[#7f91aa]">Connecting never grants agent authority.</div>
            </div>
            <button type="button" onClick={() => setPickerOpen(false)} className="p-1 text-[#7f91aa] hover:text-white" aria-label="Close wallet menu"><X className="h-3.5 w-3.5" /></button>
          </div>

          {session ? (
            <>
              <div className="mb-2 break-all rounded-md bg-white/5 p-2 text-[11px] text-[#b7c5d8]">{session.address}<div className="mt-1 text-[10px] text-[#7f91aa]">Chain {session.chainId}</div></div>
              <button type="button" onClick={async () => { await walletHandlers.disconnectWallet(); setPickerOpen(false); }} className="w-full rounded-md border border-white/10 px-3 py-2 text-left text-xs text-[#d6deea] hover:bg-white/5">Disconnect from Spotriq</button>
            </>
          ) : (
            <>
              {wallets.length > 0 ? (
                <div className="space-y-2">
                  {wallets.map((wallet) => (
                    <button key={wallet.id} type="button" disabled={busy} onClick={() => connect(wallet.id)} className="flex w-full items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-left text-xs text-[#d6deea] hover:bg-white/5 disabled:opacity-60">
                      {wallet.icon && <img src={wallet.icon} alt="" className="h-5 w-5 rounded" />}
                      <span>{wallet.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-md bg-white/5 p-2 text-[10px] leading-relaxed text-[#9aacc4]">No installed EVM wallet was detected. On desktop, install/enable a wallet extension. On mobile, open Spotriq inside your wallet's dapp browser.</div>
                  <a href={mobileLink} className="flex w-full items-center justify-between rounded-md border border-white/10 px-3 py-2 text-xs text-[#d6deea] hover:bg-white/5">Open in Trust Wallet <ExternalLink className="h-3.5 w-3.5" /></a>
                  <button type="button" onClick={() => { setPickerOpen(false); onFallback(); }} className="w-full rounded-md px-3 py-2 text-left text-[11px] text-[#8ea1bb] hover:bg-white/5">Continue with read-only wallet check</button>
                </div>
              )}
            </>
          )}
          {error && <div role="status" className="mt-2 rounded-md border border-[#f87171]/20 bg-[#f87171]/5 p-2 text-[10px] text-[#fca5a5]">{error}</div>}
        </div>
      )}
    </div>
  );
}
