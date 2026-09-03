import { WalletAccountControl } from "./WalletAccountControl";

/**
 * Backward-compatible wrapper retained so older working trees that still carry
 * WalletConnectionDialog.tsx cannot break TypeScript after the zero-service
 * wallet rewrite. The active connection UI is WalletAccountControl.
 */
export function WalletConnectionDialog({ onFallback = () => undefined }: { onFallback?: () => void } = {}) {
  return <WalletAccountControl onFallback={onFallback} />;
}
