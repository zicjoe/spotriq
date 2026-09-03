import fs from "node:fs";
function text(path){return fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8")}
function expect(path,re,msg){if(!re.test(text(path)))throw new Error(`${msg} (${path})`)}
function absent(path,re,msg){if(re.test(text(path)))throw new Error(`${msg} (${path})`)}
expect("apps/web/src/services/walletHandlers.ts",/eip6963:announceProvider/,"Wallet layer must discover multiple injected EVM wallets through EIP-6963.");
expect("apps/web/src/services/walletHandlers.ts",/window\.ethereum/,"Wallet layer must retain legacy EIP-1193 fallback.");
expect("apps/web/src/services/walletHandlers.ts",/chainId !== 56 && chainId !== 97/,"Wallet layer must stay constrained to BSC Mainnet/Testnet.");
expect("apps/web/src/components/WalletAccountControl.tsx",/Open in Trust Wallet/,"Mobile no-provider state must provide a wallet-browser route.");
expect("apps/web/src/components/WalletAccountControl.tsx",/Connecting never grants agent authority/,"Wallet UX must preserve authority separation.");
expect("apps/web/src/services/walletHandlers.ts",/eth_accounts/,"Wallet layer must silently reconcile an already-authorized account after refresh without a second connection prompt.");
expect("apps/web/src/services/walletHandlers.ts",/spotriq\.wallet\.provider\.v1/,"Wallet layer must retain a non-sensitive provider preference for refresh reconciliation.");
expect("apps/web/src/services/walletHandlers.ts",/addEventListener\("storage"/,"Wallet layer must reconcile Spotriq connect/disconnect state across browser tabs.");
expect("apps/web/src/app/App.tsx",/walletSnapshot\.session[^\n]*Check/,"Smart Money Check must visibly reuse an already-connected wallet instead of asking for unnecessary address entry.");

expect("apps/web/src/components/WalletConnectionDialog.tsx",/WalletAccountControl/,"Legacy wallet dialog compatibility shim must delegate to the active zero-service wallet control.");
absent("apps/web/src/components/WalletConnectionDialog.tsx",/cancelWalletPrompt|retryWalletDiscovery|selectWalletProvider|subscribeWalletPrompt/,"Legacy wallet dialog must not depend on removed wallet-prompt APIs.");
absent("apps/web/package.json",/@reown|thirdweb|walletconnect/i,"Web wallet connectivity must not depend on Reown, thirdweb, or WalletConnect service packages.");
absent("apps/web/src/services/walletHandlers.ts",/VITE_REOWN_PROJECT_ID|VITE_THIRDWEB|VITE_WALLETCONNECT/i,"Wallet layer must not require a third-party project ID.");
console.log("PASS: Spotriq v0.39 zero-service wallet connectivity contract passed (EIP-6963 + EIP-1193, BSC-only, mobile wallet-browser fallback, no paid provider dependency).");
