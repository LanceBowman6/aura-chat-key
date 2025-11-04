import { useCallback, useMemo, useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { verifyMessage, Address, getAddress, createPublicClient, http, parseEther } from 'viem';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { toast } from '@/components/ui/use-toast';
import { hardhat } from 'viem/chains';

// Contract ABI for EncryptedChatWithAuth
const ENCRYPTED_CHAT_WITH_AUTH_ABI = [
  {
    name: "createSession",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "message", type: "string" },
      { name: "signature", type: "bytes" },
      { name: "expiresAt", type: "uint256" }
    ],
    outputs: []
  },
  {
    name: "hasValidSession",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" }
    ],
    outputs: [
      { name: "", type: "bool" }
    ]
  },
  {
    name: "sendMessage",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "encryptedMessage", type: "bytes32" },
      { name: "inputProof", type: "bytes" },
      { name: "signature", type: "bytes" }
    ],
    outputs: []
  },
  {
    name: "decryptMessage",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "messageId", type: "uint256" },
      { name: "signature", type: "bytes" }
    ],
    outputs: []
  },
  {
    name: "grantAccess",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "signature", type: "bytes" }
    ],
    outputs: []
  },
  {
    name: "revokeSession",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: []
  }
] as const;

type AuthSession = {
  address: Address;
  message: string;
  signature: `0x${string}`;
  signedAt: number; // ms epoch
  expiresAt: number; // ms epoch
};

const STORAGE_KEY = 'encryptme:auth-session';

function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function saveSession(session: AuthSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

export function useWalletAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { openConnectModal } = useConnectModal();

  const session = useMemo(() => loadSession(), [address, isConnected]);

  useEffect(() => {
    // Proactively clear expired sessions to avoid stale UI
    if (session && Date.now() >= session.expiresAt) {
      clearSession();
    }
  }, [session]);

  const isSessionValidForAddress = useMemo(() => {
    if (!session || !address) return false;
    if (session.address.toLowerCase() !== address.toLowerCase()) return false;
    if (Date.now() >= session.expiresAt) return false;
    try {
      // Verify signature locally
      const valid = verifyMessage({
        address: getAddress(session.address),
        message: session.message,
        signature: session.signature,
      });
      return !!valid;
    } catch {
      return false;
    }
  }, [session, address]);

  const isAuthenticated = isConnected && isSessionValidForAddress;

  const ensureConnected = useCallback(async () => {
    if (isConnected) return true;
    if (openConnectModal) {
      openConnectModal();
      // Inform user to complete connection in the modal
      toast({ title: 'Connect Wallet', description: 'Wallet authentication is required to send and decrypt messages.' });
    } else {
      toast({ title: 'Unable to Open Connection Modal', description: 'Please click the button in the top right corner to connect your wallet.' });
    }
    return false;
  }, [isConnected, openConnectModal]);

  const signIn = useCallback(async () => {
    if (!address) throw new Error('Wallet not connected');
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const expiresAt = now + oneDayMs;
    const msg = [
      'EncryptMe Chat Authentication',
      `Address: ${address}`,
      `Issued At: ${new Date(now).toISOString()}`,
      `Expires At: ${new Date(expiresAt).toISOString()}`,
      'Purpose: Authorize message send/decrypt in app.'
    ].join('\n');

    const signature = await signMessageAsync({ message: msg });
    const newSession: AuthSession = {
      address: address as Address,
      message: msg,
      signature,
      signedAt: now,
      expiresAt,
    };
    saveSession(newSession);
    return true;
  }, [address, signMessageAsync]);

  const ensureAuthenticated = useCallback(async () => {
    if (!isConnected) {
      const ok = await ensureConnected();
      if (!ok) return false;
    }
    if (isAuthenticated) return true;
    try {
      await signIn();
      toast({ title: 'Authentication Successful', description: 'You have completed wallet signature verification.' });
      return true;
    } catch (e) {
      toast({ title: 'Authentication Failed', description: 'Wallet signature is required to continue.' });
      return false;
    }
  }, [isConnected, isAuthenticated, ensureConnected, signIn]);

  const signOut = useCallback(() => {
    clearSession();
  }, []);

  const requireAuth = useCallback(
    async <T,>(fn: () => Promise<T> | T): Promise<T> => {
      const ok = await ensureAuthenticated();
      if (!ok) throw new Error('Wallet authentication required');
      return await fn();
    },
    [ensureAuthenticated],
  );

  return {
    address,
    isConnected,
    isAuthenticated,
    ensureConnected,
    ensureAuthenticated,
    signIn,
    signOut,
    requireAuth,
  };
}
