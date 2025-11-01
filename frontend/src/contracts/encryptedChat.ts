import type { Address } from 'viem';

// Minimal ABI aligned with EncryptedChatWithAuth (demo-relaxed FHE version)
// Keep in sync with contracts/EncryptedChatWithAuth.sol
export const ENCRYPTED_CHAT_ABI = [
  // Sessions
  {
    name: 'createSession',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'message', type: 'string' },
      { name: 'signature', type: 'bytes' },
      { name: 'expiresAt', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'hasValidSession',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  // Registration
  {
    name: 'registerUser',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'publicKey', type: 'bytes32' }],
    outputs: [],
  },
  // Grant access
  {
    name: 'grantAccess',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
  // Messaging
  {
    name: 'sendMessage',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'encryptedContent', type: 'bytes32' },
      { name: 'contentProof', type: 'bytes' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'decryptMessage',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'messageId', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
  },
  // Reads
  {
    name: 'getMessageCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'getMessageMetadata',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'messageId', type: 'uint256' }],
    outputs: [
      { name: 'sender', type: 'address' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'isDecrypted', type: 'bool' },
    ],
  },
  {
    name: 'getEncryptedMessage',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'messageId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'users',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [
      { name: 'isRegistered', type: 'bool' },
      { name: 'publicKey', type: 'bytes32' },
      { name: 'nonce', type: 'uint256' },
    ],
  },
] as const;

export function getContractAddressForChain(chainId?: number): Address | undefined {
  // Prefer explicit per-chain env vars
  const fromEnv = (key: string) => (import.meta as any).env?.[key] as string | undefined;
  const byChain = (id?: number): string | undefined => {
    if (!id) return fromEnv('VITE_ENCRYPTED_CHAT_ADDRESS');
    if (id === 31337) return fromEnv('VITE_ENCRYPTED_CHAT_ADDRESS_31337') || fromEnv('VITE_ENCRYPTED_CHAT_ADDRESS');
    if (id === 11155111) return fromEnv('VITE_ENCRYPTED_CHAT_ADDRESS_11155111') || fromEnv('VITE_ENCRYPTED_CHAT_ADDRESS');
    return fromEnv('VITE_ENCRYPTED_CHAT_ADDRESS');
  };

  const maybe = byChain(chainId);
  if (maybe && /^0x[a-fA-F0-9]{40}$/.test(maybe)) return maybe as Address;

  // Fallback to Hardhat default address for local development
  if (chainId === undefined || chainId === 31337) return '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' as Address;
  return undefined;
}

// Default to local Hardhat address unless env overrides
export const ENCRYPTED_CHAT_ADDRESS: Address = (getContractAddressForChain(31337) as Address);
