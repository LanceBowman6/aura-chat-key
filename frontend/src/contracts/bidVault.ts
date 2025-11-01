import type { Address } from 'viem';

export const BID_VAULT_ABI = [
  {
    name: 'commitBid',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'hash', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'revealBid',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'salt', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'hasRevealed',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'bidder', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'commitOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'bidder', type: 'address' }],
    outputs: [
      { name: 'hash', type: 'bytes32' },
      { name: 'revealed', type: 'bool' },
    ],
  },
] as const;

export function getBidVaultAddressForChain(chainId?: number): Address | undefined {
  const fromEnv = (key: string) => (import.meta as any).env?.[key] as string | undefined;
  const byChain = (id?: number): string | undefined => {
    if (!id) return fromEnv('VITE_BID_VAULT_ADDRESS');
    if (id === 31337) return fromEnv('VITE_BID_VAULT_ADDRESS_31337') || fromEnv('VITE_BID_VAULT_ADDRESS');
    if (id === 11155111) return fromEnv('VITE_BID_VAULT_ADDRESS_11155111') || fromEnv('VITE_BID_VAULT_ADDRESS');
    return fromEnv('VITE_BID_VAULT_ADDRESS');
  };

  const maybe = byChain(chainId);
  if (maybe && /^0x[a-fA-F0-9]{40}$/.test(maybe)) return maybe as Address;

  if (chainId === undefined || chainId === 31337) return '0x0000000000000000000000000000000000000000' as Address; // placeholder
  return undefined;
}
