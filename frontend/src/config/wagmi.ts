import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { sepolia, hardhat } from 'wagmi/chains';

// Use env project id; "demo" is fine for localhost-only testing
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo';

// Network configuration aligned with @shield-trade-loop local/testnet pattern.
// - Always expose Hardhat (31337) and Sepolia (11155111)
// - Prefer explicit RPC URLs via env to avoid CORS/cache surprises
// Vite envs must be prefixed with VITE_
const localRpcUrl = (import.meta as any).env?.VITE_LOCAL_RPC_URL || 'http://127.0.0.1:8545';
const sepoliaRpcUrl = (import.meta as any).env?.VITE_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';

// Patch Hardhat chain to use the explicit local RPC URL
const customHardhat = {
  ...hardhat,
  rpcUrls: {
    ...hardhat.rpcUrls,
    default: { http: [localRpcUrl] },
    public: { http: [localRpcUrl] },
  },
} as const;

// Build wagmi config via RainbowKit helper (v2 pattern)
export const config = createConfig({
  chains: [customHardhat, sepolia],
  connectors: [injected()],
  transports: {
    [customHardhat.id]: http(localRpcUrl, { timeout: 10_000 }),
    [sepolia.id]: http(sepoliaRpcUrl, { timeout: 12_000 }),
  },
  ssr: false,
});
