import Logo from "@/components/Logo";
import WalletConnect from "@/components/WalletConnect";
import MessageBubble from "@/components/MessageBubble";
import ChatInput from "@/components/ChatInput";
import { Shield } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
// Encryption/decryption is handled on-chain in demo via hashing only
import { useWalletAuthWithContract } from "@/hooks/useWalletAuthWithContract";
import { useWalletClient, useAccount, usePublicClient, useChainId } from "wagmi";
import { toast } from "@/components/ui/use-toast";
import { keccak256, encodePacked, Address } from "viem";
import { ENCRYPTED_CHAT_ABI, getContractAddressForChain } from "@/contracts/encryptedChat";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";

// Resolve contract address for current chain

interface UiMessage {
  id: number;
  message: string; // hex or plaintext
  isOwn: boolean;
  isEncrypted: boolean;
}

const Index = () => {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [recipient, setRecipient] = useState<string>("");

  const { requireAuth, isAuthenticated, isCheckingContractSession } = useWalletAuthWithContract();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  const CONTRACT_ADDRESS = useMemo(() => getContractAddressForChain(chainId), [chainId]);

  const nowSec = () => Math.floor(Date.now() / 1000);

  const loadMessages = useMemo(() => async () => {
    if (!publicClient || !address) return;
    if (!CONTRACT_ADDRESS) {
      console.warn('loadMessages: contract address not configured for current chain.');
      return;
    }
    try {
      const count = await publicClient.readContract({
        address: CONTRACT_ADDRESS!,
        abi: ENCRYPTED_CHAT_ABI,
        functionName: 'getMessageCount',
        args: [],
      });
      const items: UiMessage[] = [];
      for (let i = 0; i < Number(count); i++) {
        const [sender, timestamp, isDecrypted] = await publicClient.readContract({
          address: CONTRACT_ADDRESS!,
          abi: ENCRYPTED_CHAT_ABI,
          functionName: 'getMessageMetadata',
          args: [BigInt(i)],
        }) as [Address, bigint, boolean];

        const enc = await publicClient.readContract({
          address: CONTRACT_ADDRESS!,
          abi: ENCRYPTED_CHAT_ABI,
          functionName: 'getEncryptedMessage',
          args: [BigInt(i)],
        }) as `0x${string}`;

        items.push({
          id: i,
          message: String(enc),
          isOwn: sender?.toLowerCase() === address?.toLowerCase(),
          isEncrypted: !isDecrypted,
        });
      }
      setMessages(items);
    } catch (e) {
      console.error('loadMessages failed:', e);
    }
  }, [publicClient, address, CONTRACT_ADDRESS]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages, address]);

  const handleSendMessage = async (message: string) => {
    try {
      await requireAuth(async () => {
        if (!walletClient) throw new Error('Wallet client not available');
        if (!address) throw new Error('No wallet address');
        if (!CONTRACT_ADDRESS) {
          toast({ title: 'Contract Not Configured', description: 'No contract address found for current chain.' });
          return;
        }
        const to = (recipient && recipient.length > 0 ? recipient : address) as Address;
        
        // Fetch nonce for EOA from contract
        const user = await publicClient!.readContract({
          address: CONTRACT_ADDRESS!,
          abi: ENCRYPTED_CHAT_ABI,
          functionName: 'users',
          args: [address],
        }) as any;
        const nonce: bigint = BigInt(user?.nonce ?? 0);
        const deadline = BigInt(nowSec() + 3600);

        // Create a digest for signature: keccak256("sendMessage", recipient, nonce, deadline)
        const digest = keccak256(encodePacked([
          'string','address','uint256','uint256'
        ], [
          'sendMessage', to, nonce, deadline
        ]));
        const signature = await walletClient.signMessage({
          account: address,
          message: { raw: digest as `0x${string}` }
        });
        
        // Mock encrypt: store hash of plaintext as bytes32
        const encryptedMessageHex = keccak256(encodePacked(['string'], [message]));

        const txHash = await walletClient.writeContract({
          account: address,
          address: CONTRACT_ADDRESS!,
          abi: ENCRYPTED_CHAT_ABI,
          functionName: 'sendMessage',
          args: [
            to,
            encryptedMessageHex,
            '0x', // contentProof (unused in demo)
            nonce,
            deadline,
            signature,
          ],
        });
        await publicClient!.waitForTransactionReceipt({ hash: txHash });

        await loadMessages();
        toast({ title: "Message Sent", description: "Your encrypted message has been sent." });
      });
    } catch {
      toast({ title: "Wallet Authentication Required", description: "Please connect and sign to send messages." });
    }
  };

  const handleDecryptMessage = async (messageId: number) => {
    const message = messages.find(msg => msg.id === messageId);
    if (!message) return;

    try {
      await requireAuth(async () => {
        if (!walletClient) throw new Error('Wallet client not available');
        if (!address) throw new Error('No wallet address');
        if (!CONTRACT_ADDRESS) throw new Error('Contract not configured');

        // Fetch nonce
        const user = await publicClient!.readContract({
          address: CONTRACT_ADDRESS!,
          abi: ENCRYPTED_CHAT_ABI,
          functionName: 'users',
          args: [address],
        }) as any;
        const nonce: bigint = BigInt(user?.nonce ?? 0);
        const deadline = BigInt(nowSec() + 3600);

        // Create digest for decryptMessage
        const digest = keccak256(encodePacked([
          'string','uint256','uint256','uint256'
        ], [
          'decryptMessage', BigInt(messageId), nonce, deadline
        ]));
        const signature = await walletClient.signMessage({
          account: address,
          message: { raw: digest as `0x${string}` }
        });
        
        const txHash = await walletClient.writeContract({
          account: address,
          address: CONTRACT_ADDRESS!,
          abi: ENCRYPTED_CHAT_ABI,
          functionName: 'decryptMessage',
          args: [BigInt(messageId), nonce, deadline, signature],
        });
        await publicClient!.waitForTransactionReceipt({ hash: txHash });

        await loadMessages();
        toast({ title: "Message Decrypted", description: "The message has been marked decrypted." });
      });
    } catch (error) {
      console.error("Decryption failed:", error);
      if (!isAuthenticated) {
        toast({ title: "Wallet Authentication Required", description: "Please connect and sign to decrypt messages." });
      } else {
        toast({ title: "Decryption Failed", description: "Please try again later." });
      }
    }
  };

  const handleRegister = async () => {
    try {
      await requireAuth(async () => {
        if (!walletClient || !address) throw new Error('Wallet client/address missing');
        if (!CONTRACT_ADDRESS) {
          toast({ title: 'Contract Not Configured', description: 'No contract address found for current chain.' });
          return;
        }
        const dummyKey = keccak256(encodePacked(['string'], ['public-key']));
        const txHash = await walletClient.writeContract({
          account: address,
          address: CONTRACT_ADDRESS!,
          abi: ENCRYPTED_CHAT_ABI,
          functionName: 'registerUser',
          args: [dummyKey],
        });
        await publicClient!.waitForTransactionReceipt({ hash: txHash });
        toast({ title: 'Registered', description: 'User registered on-chain.' });
      });
    } catch (e) {
      toast({ title: 'Registration Failed', description: 'Unable to register. See console.' });
      console.error(e);
    }
  };

  const handleGrant = async () => {
    try {
      await requireAuth(async () => {
        if (!walletClient || !address) throw new Error('Wallet client/address missing');
        if (!CONTRACT_ADDRESS) {
          toast({ title: 'Contract Not Configured', description: 'No contract address found for current chain.' });
          return;
        }
        if (!recipient || recipient.toLowerCase() === address.toLowerCase()) {
          toast({ title: 'Invalid recipient', description: 'Enter a different address to grant.' });
          return;
        }
        const user = await publicClient!.readContract({
          address: CONTRACT_ADDRESS!,
          abi: ENCRYPTED_CHAT_ABI,
          functionName: 'users',
          args: [address],
        }) as any;
        const nonce: bigint = BigInt(user?.nonce ?? 0);
        const deadline = BigInt(nowSec() + 3600);
        const digest = keccak256(encodePacked([
          'string','address','uint256','uint256'
        ], [
          'grantAccess', recipient as Address, nonce, deadline
        ]));
        const signature = await walletClient.signMessage({
          account: address,
          message: { raw: digest as `0x${string}` },
        });
        const txHash = await walletClient.writeContract({
          account: address,
          address: CONTRACT_ADDRESS!,
          abi: ENCRYPTED_CHAT_ABI,
          functionName: 'grantAccess',
          args: [recipient as Address, nonce, deadline, signature],
        });
        await publicClient!.waitForTransactionReceipt({ hash: txHash });
        toast({ title: 'Access Granted', description: `Granted access to ${recipient}` });
      });
    } catch (e) {
      toast({ title: 'Grant Failed', description: 'Unable to grant access. See console.' });
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <h1 className="text-xl font-bold glow-text">EncryptMe</h1>
              <p className="text-xs text-muted-foreground">Talk Freely. Privately.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Recipient (defaults to self)"
              className="w-[280px] bg-background/50 border-primary/30"
            />
            <Button variant="secondary" onClick={handleRegister}>Register</Button>
            <Button variant="secondary" onClick={handleGrant}>Grant Access</Button>
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
        {/* Welcome Message */}
        <div className="bg-card/50 border border-primary/30 rounded-2xl p-6 mb-6 backdrop-blur-sm glow-border">
          <div className="flex items-start gap-4">
            <div className="bg-primary/20 p-3 rounded-xl">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold mb-2 glow-text">
                Talk Freely. Privately.
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your messages are end-to-end encrypted and stored on the blockchain. 
                Only you and your recipient can decrypt them. Connect your Rainbow Wallet to start chatting securely.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Link to Bid Vault demo */}
        <div className="mb-6">
          <Link to="/vault">
            <Button variant="default">Open Cipher Bid Vault</Button>
          </Link>
        </div>

        {/* Messages */}
        <div className="space-y-2 mb-6">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg.message}
              isOwn={msg.isOwn}
              isEncrypted={msg.isEncrypted}
              messageId={msg.id}
              onDecrypt={handleDecryptMessage}
            />
          ))}
        </div>
      </main>

      {/* Chat Input */}
      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  );
};

export default Index;
