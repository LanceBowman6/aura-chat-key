import { useCallback, useMemo, useState, useEffect } from 'react';
import { useAccount, useSignMessage, useWalletClient } from 'wagmi';
import { verifyMessage, Address, getAddress } from 'viem';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { toast } from '@/components/ui/use-toast';
import { usePublicClient } from 'wagmi';
import { getContractAddressForChain } from '@/contracts/encryptedChat';
import { useChainId } from 'wagmi';

// Minimal ABI for functions used in this hook
const ENCRYPTED_CHAT_WITH_AUTH_ABI = [
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
] as const;

// Resolve contract address for current chain

type AuthSession = {
  address: Address;
  message: string;
  signature: `0x${string}`;
  signedAt: number; // ms epoch
  expiresAt: number; // ms epoch
  hasContractSession: boolean; // Track if contract session exists
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

// Public client from wagmi
// (Hooks cannot be called conditionally; we use it inside exported hook below.)

export function useWalletAuthWithContract() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { openConnectModal } = useConnectModal();
  const { data: walletClient } = useWalletClient();
  const [isCheckingContractSession, setIsCheckingContractSession] = useState(false);
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const CONTRACT_ADDRESS = useMemo(() => getContractAddressForChain(chainId), [chainId]);

  // Keep session reactive to localStorage changes we make here
  const [session, setSession] = useState<AuthSession | null>(loadSession());
  useEffect(() => {
    setSession(loadSession());
  }, [address, isConnected]);

  // Check if user has a valid session in the contract
  const checkContractSession = useCallback(async (userAddress: Address): Promise<boolean> => {
    if (!userAddress) return false;
    
    try {
      setIsCheckingContractSession(true);
      if (!CONTRACT_ADDRESS) return false;
      // Add a soft timeout to avoid blocking UI on slow RPCs
      const timeoutMs = 7000;
      const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs));
      const read = publicClient!.readContract({
        address: CONTRACT_ADDRESS as Address,
        abi: ENCRYPTED_CHAT_WITH_AUTH_ABI,
        functionName: 'hasValidSession',
        args: [userAddress]
      }) as Promise<boolean>;
      const hasValidSession = await Promise.race([read, timeout]);
      return Boolean(hasValidSession);
    } catch (error) {
      console.error("Error checking contract session:", error);
      return false;
    } finally {
      setIsCheckingContractSession(false);
    }
  }, [CONTRACT_ADDRESS, publicClient]);

  // Update session with contract session status
  useEffect(() => {
    if (address && session && session.address.toLowerCase() === address.toLowerCase()) {
      checkContractSession(address).then((hasContractSession) => {
        if (session.hasContractSession !== hasContractSession) {
          const updated = { ...session, hasContractSession } as AuthSession;
          saveSession(updated);
          setSession(updated);
        }
      });
    }
  }, [address, session, checkContractSession]);

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

  // Consider user authenticated for local/demo actions once they have a valid wallet signature
  // On-chain session is optional for local-only interactions; we still try to create it when possible.
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
      hasContractSession: false, // Will be updated after contract session creation
    };
    saveSession(newSession);
    setSession(newSession);
    return true;
  }, [address, signMessageAsync]);

  const createContractSession = useCallback(async () => {
    if (!address || !session) throw new Error('Wallet not connected or no local session');
    
    if (!walletClient) throw new Error('Wallet client not available');
    if (!CONTRACT_ADDRESS) throw new Error('Contract not configured for current chain');
    
    try {
      // Create session in contract
      const txHash = await walletClient.writeContract({
        account: address,
        address: CONTRACT_ADDRESS as Address,
        abi: ENCRYPTED_CHAT_WITH_AUTH_ABI,
        functionName: 'createSession',
        args: [
          session.message,
          session.signature,
          Math.floor(session.expiresAt / 1000), // Convert to seconds for contract
        ],
      });
      
      // Wait for transaction to be mined
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      // Update session to reflect contract session creation
      const updatedSession = {
        ...session,
        hasContractSession: true
      };
      saveSession(updatedSession);
      setSession(updatedSession);
      
      toast({ title: 'Contract Session Created', description: 'Your authentication session has been created on the blockchain.' });
      return true;
    } catch (error: any) {
      console.error("Error creating contract session:", error);
      const message: string = String(
        error?.shortMessage ||
        error?.cause?.shortMessage ||
        error?.cause?.message ||
        error?.message ||
        error
      );
      if (message.includes('User rejected')) {
        toast({ title: 'Signature Rejected', description: 'You cancelled the transaction in your wallet.' });
      } else if (message.includes('User not registered')) {
        toast({ title: 'Registration Required', description: 'Please register your user in the contract before authenticating.' });
      } else {
        toast({ title: 'Contract Session Failed', description: 'Failed to create session on blockchain. Please try again.' });
      }
      return false;
    }
  }, [address, session, walletClient, publicClient, CONTRACT_ADDRESS]);

  const ensureAuthenticated = useCallback(async () => {
    if (!isConnected) {
      const ok = await ensureConnected();
      if (!ok) return false;
    }
    
    // Check if we have a local session
    if (!isSessionValidForAddress) {
      try {
        await signIn();
        toast({ title: 'Authentication Successful', description: 'You have completed wallet signature verification.' });
      } catch (e) {
        toast({ title: 'Authentication Failed', description: 'Wallet signature is required to continue.' });
        return false;
      }
    }
    
    // Check if we have a contract session
    const hasContractSession = await checkContractSession(address as Address);
    if (!hasContractSession) {
      try {
        const ok = await createContractSession();
        if (!ok) {
          // Allow non-registered users to continue for local/demo actions
          return true;
        }
      } catch (e: any) {
        // If user is not registered, allow local/demo actions to continue
        const msg = String(e?.message || e);
        if (msg.includes('User not registered')) return true;
        toast({ title: 'Contract Authentication Failed', description: 'Failed to create blockchain session. Please try again.' });
        return false;
      }
    }
    
    return true;
  }, [isConnected, isSessionValidForAddress, address, ensureConnected, signIn, checkContractSession, createContractSession]);

  const signOut = useCallback(() => {
    clearSession();
    toast({ title: 'Signed Out', description: 'Your authentication session has been cleared.' });
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
    isCheckingContractSession,
    ensureConnected,
    ensureAuthenticated,
    signIn,
    signOut,
    createContractSession,
    checkContractSession,
    requireAuth,
  };
}
