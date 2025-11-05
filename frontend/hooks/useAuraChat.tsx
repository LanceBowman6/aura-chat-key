"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { AURA_CHAT_ABI, getAuraChatAddress } from "@/abi/AuraChat";

export interface ChatMessage {
  id: number;
  sender: string;
  recipient: string;
  encryptedContent: string;
  timestamp: number;
  decryptedBySender: boolean;
  decryptedByRecipient: boolean;
  isSent: boolean; // true if current user is sender
}

export interface UserInfo {
  isRegistered: boolean;
  nickname: string;
  messageCount: bigint;
}

type AuraChatInfo = {
  abi: typeof AURA_CHAT_ABI;
  address?: `0x${string}`;
  chainId?: number;
};

function getAuraChatByChainId(chainId: number | undefined): AuraChatInfo {
  if (!chainId) {
    return { abi: AURA_CHAT_ABI };
  }

  const address = getAuraChatAddress(chainId);
  if (!address || address === ethers.ZeroAddress) {
    return { abi: AURA_CHAT_ABI, chainId };
  }

  return {
    address: address as `0x${string}`,
    chainId,
    abi: AURA_CHAT_ABI,
  };
}

export const useAuraChat = (parameters: {
  instance: FhevmInstance | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<(ethersSigner: ethers.JsonRpcSigner | undefined) => boolean>;
}) => {
  const {
    instance,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  // States
  const [userInfo, setUserInfo] = useState<UserInfo | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const auraChatRef = useRef<AuraChatInfo | undefined>(undefined);

  // AuraChat contract info
  const auraChat = useMemo(() => {
    const c = getAuraChatByChainId(chainId);
    auraChatRef.current = c;

    if (!c.address) {
      setMessage(`AuraChat deployment not found for chainId=${chainId}.`);
    }

    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    return Boolean(auraChat.address) && auraChat.address !== ethers.ZeroAddress;
  }, [auraChat]);

  // Get user account address
  const userAddress = useMemo(() => {
    return ethersSigner?.address;
  }, [ethersSigner]);

  // Check if user is registered
  const checkRegistration = useCallback(async () => {
    if (!auraChat.address || !ethersReadonlyProvider || !userAddress) {
      setUserInfo(undefined);
      return;
    }

    try {
      const contract = new ethers.Contract(
        auraChat.address,
        auraChat.abi,
        ethersReadonlyProvider
      );

      const [isRegistered, nickname, messageCount] = await contract.getUserInfo(userAddress);
      setUserInfo({ isRegistered, nickname, messageCount });
    } catch (error) {
      console.error("[useAuraChat] checkRegistration error:", error);
      setUserInfo(undefined);
    }
  }, [auraChat.address, auraChat.abi, ethersReadonlyProvider, userAddress]);

  // Auto-check registration on mount and when dependencies change
  useEffect(() => {
    checkRegistration();
  }, [checkRegistration]);

  // Register user
  const register = useCallback(async (nickname: string) => {
    if (!auraChat.address || !ethersSigner || !instance) {
      setMessage("Cannot register: missing contract, signer, or FHE instance");
      return false;
    }

    setIsLoading(true);
    setMessage("Registering...");

    try {
      const contract = new ethers.Contract(
        auraChat.address,
        auraChat.abi,
        ethersSigner
      );

      const tx = await contract.register(nickname);
      setMessage(`Waiting for tx: ${tx.hash}...`);
      await tx.wait();

      setMessage("Registration successful!");
      await checkRegistration();
      return true;
    } catch (error: unknown) {
      console.error("[useAuraChat] register error:", error);
      const errorMessage = parseContractError(error);
      setMessage(`Registration failed: ${errorMessage}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [auraChat.address, auraChat.abi, ethersSigner, instance, checkRegistration]);

  // Check if recipient is registered
  const checkRecipientRegistered = useCallback(async (recipientAddress: string): Promise<boolean> => {
    if (!auraChat.address || !ethersReadonlyProvider) {
      setMessage("Missing contract address or provider");
      return false;
    }

    // Validate address format
    if (!ethers.isAddress(recipientAddress)) {
      setMessage("Invalid recipient address format");
      return false;
    }

    try {
      const contract = new ethers.Contract(
        auraChat.address,
        auraChat.abi,
        ethersReadonlyProvider
      );

      const isRegistered = await contract.isUserRegistered(recipientAddress);
      if (!isRegistered) {
        setMessage(`Recipient ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)} is not registered`);
      }
      return isRegistered;
    } catch (error) {
      console.error("[useAuraChat] checkRecipientRegistered error:", error);
      setMessage(`Failed to check recipient registration: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }, [auraChat.address, auraChat.abi, ethersReadonlyProvider]);

  // Rate limiting state
  const lastSendTime = useRef<number>(0);
  const SEND_COOLDOWN = 5000; // 5 seconds between sends

  // Send encrypted message
  const sendMessage = useCallback(async (recipientAddress: string, messageContent: string) => {
    if (!auraChat.address || !ethersSigner || !instance || !userAddress) {
      setMessage("Cannot send: missing contract, signer, or FHE instance");
      return false;
    }

    // Rate limiting check
    const now = Date.now();
    if (now - lastSendTime.current < SEND_COOLDOWN) {
      const remainingTime = Math.ceil((SEND_COOLDOWN - (now - lastSendTime.current)) / 1000);
      setMessage(`Please wait ${remainingTime} seconds before sending another message`);
      return false;
    }

    const thisChainId = chainId;
    const thisAddress = auraChat.address;
    const thisSigner = ethersSigner;

    setIsLoading(true);
    setMessage("Checking recipient...");

    try {
      // Check if recipient is registered
      const isRecipientRegistered = await checkRecipientRegistered(recipientAddress);
      if (!isRecipientRegistered) {
        setMessage("Recipient is not registered");
        setIsLoading(false);
        return false;
      }

      // Check if sending to self
      if (recipientAddress.toLowerCase() === userAddress.toLowerCase()) {
        setMessage("Cannot send to yourself");
        setIsLoading(false);
        return false;
      }

      setMessage("Encrypting message with FHE...");

      // Allow browser to repaint before CPU-heavy FHE encryption
      await new Promise((r) => setTimeout(r, 100));

      const isStale = () =>
        thisAddress !== auraChatRef.current?.address ||
        !sameChain.current(thisChainId) ||
        !sameSigner.current(thisSigner);

      // Convert message to uint32 (simple hash for demo)
      const messageBytes = new TextEncoder().encode(messageContent);
      let sum = 0;
      for (const b of messageBytes) sum += b;
      const messageValue = sum % 4294967296; // uint32 max

      // Create FHE encrypted input
      const input = instance.createEncryptedInput(thisAddress, thisSigner.address);
      input.add32(messageValue);
      const enc = await input.encrypt();

      if (isStale()) {
        setMessage("Context changed, aborting send");
        setIsLoading(false);
        return false;
      }

      setMessage("Sending encrypted message...");

      const contract = new ethers.Contract(
        thisAddress,
        auraChat.abi,
        thisSigner
      );

      // Call sendMessage with FHE encrypted input
      const tx: ethers.TransactionResponse = await contract.sendMessage(
        recipientAddress,
        enc.handles[0],
        enc.inputProof
      );

      setMessage(`Waiting for tx: ${tx.hash}...`);
      await tx.wait();

      if (isStale()) {
        setMessage("Context changed after send");
        setIsLoading(false);
        return false;
      }

      setMessage("Message sent successfully!");
      lastSendTime.current = now; // Update last send time
      await loadMessages();
      return true;
    } catch (error: unknown) {
      console.error("[useAuraChat] sendMessage error:", error);
      const errorMessage = parseContractError(error);
      setMessage(`Send failed: ${errorMessage}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [auraChat.address, auraChat.abi, ethersSigner, instance, userAddress, chainId, sameChain, sameSigner, checkRecipientRegistered]);

  // Load messages for current user
  const loadMessages = useCallback(async () => {
    if (!auraChat.address || !ethersReadonlyProvider || !userAddress) {
      setMessages([]);
      return;
    }

    try {
      const contract = new ethers.Contract(
        auraChat.address,
        auraChat.abi,
        ethersReadonlyProvider
      );

      // Get sent and received message IDs
      const [sentIds, receivedIds] = await Promise.all([
        contract.getSentMessageIds(userAddress),
        contract.getReceivedMessageIds(userAddress),
      ]);

      // Combine and deduplicate
      const allIds = [...new Set([...sentIds, ...receivedIds])].map(id => BigInt(id));
      
      if (allIds.length === 0) {
        setMessages([]);
        return;
      }

      // Fetch all messages
      const [senders, recipients, contents, timestamps, decryptedBySenders, decryptedByRecipients] = 
        await contract.getMessages(allIds);

      const msgs: ChatMessage[] = allIds.map((id, i) => ({
        id: Number(id),
        sender: senders[i],
        recipient: recipients[i],
        encryptedContent: contents[i],
        timestamp: Number(timestamps[i]),
        decryptedBySender: decryptedBySenders[i],
        decryptedByRecipient: decryptedByRecipients[i],
        isSent: senders[i].toLowerCase() === userAddress.toLowerCase(),
      }));

      // Sort by timestamp descending
      msgs.sort((a, b) => b.timestamp - a.timestamp);
      setMessages(msgs);
    } catch (error) {
      console.error("[useAuraChat] loadMessages error:", error);
      setMessages([]);
    }
  }, [auraChat.address, auraChat.abi, ethersReadonlyProvider, userAddress]);

  // Decrypt message (mark as decrypted)
  const decryptMessage = useCallback(async (messageId: number) => {
    if (!auraChat.address || !ethersSigner) {
      setMessage("Cannot decrypt: missing contract or signer");
      return false;
    }

    setIsLoading(true);
    setMessage("Marking message as decrypted...");

    try {
      const contract = new ethers.Contract(
        auraChat.address,
        auraChat.abi,
        ethersSigner
      );

      const tx = await contract.decryptMessage(BigInt(messageId));
      setMessage(`Waiting for tx: ${tx.hash}...`);
      await tx.wait();

      setMessage("Message decrypted!");
      await loadMessages();
      return true;
    } catch (error: unknown) {
      console.error("[useAuraChat] decryptMessage error:", error);
      const errorMessage = parseContractError(error);
      setMessage(`Decrypt failed: ${errorMessage}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [auraChat.address, auraChat.abi, ethersSigner, loadMessages]);

  // Auto-load messages when user is registered
  useEffect(() => {
    if (userInfo?.isRegistered) {
      loadMessages();
    }
  }, [userInfo?.isRegistered, loadMessages]);

  return {
    auraChat,
    isDeployed,
    userAddress,
    userInfo,
    messages,
    isLoading,
    message,
    register,
    sendMessage,
    loadMessages,
    decryptMessage,
    checkRegistration,
  };
};

// Helper to parse contract errors
function parseContractError(error: unknown): string {
  const errorString = String(error);
  
  // Check for common revert reasons
  if (errorString.includes("NotRegistered")) return "You are not registered";
  if (errorString.includes("AlreadyRegistered")) return "Already registered";
  if (errorString.includes("RecipientNotRegistered")) return "Recipient is not registered";
  if (errorString.includes("CannotSendToYourself")) return "Cannot send to yourself";
  if (errorString.includes("InvalidNickname")) return "Invalid nickname (1-32 characters)";
  if (errorString.includes("AlreadyDecrypted")) return "Message already decrypted";
  if (errorString.includes("NotAuthorized")) return "Not authorized";
  if (errorString.includes("InvalidMessageId")) return "Invalid message ID";
  if (errorString.includes("user rejected")) return "Transaction rejected by user";
  
  // Return truncated error for unknown errors
  if (errorString.length > 100) {
    return errorString.substring(0, 100) + "...";
  }
  return errorString;
}
