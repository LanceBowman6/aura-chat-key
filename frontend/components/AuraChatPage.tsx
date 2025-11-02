"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Send, Lock, Unlock, User, MessageSquare, RefreshCw } from "lucide-react";
import { useMetaMaskEthersSigner } from "@/hooks/metamask/useMetaMaskEthersSigner";
import { useFhevm } from "@/fhevm/useFhevm";
import { useAuraChat, ChatMessage } from "@/hooks/useAuraChat";

const Logo = () => (
  <div className="relative flex items-center justify-center">
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-glow-pulse">
      <path d="M8 12C8 9.79086 9.79086 8 12 8H20C22.2091 8 24 9.79086 24 12V20C24 22.2091 22.2091 24 20 24H14L8 28V12Z" fill="hsl(195 100% 40%)" />
      <path d="M40 28C40 30.2091 38.2091 32 36 32H28C25.7909 32 24 30.2091 24 28V20C24 17.7909 25.7909 16 28 16H34L40 12V28Z" fill="hsl(280 100% 50%)" />
      <circle cx="24" cy="20" r="4" fill="hsl(0 0% 100%)" stroke="hsl(140 70% 40%)" strokeWidth="1.5" />
      <path d="M23 24L23 28C23 28.5523 23.4477 29 24 29C24.5523 29 25 28.5523 25 28L25 24" stroke="hsl(140 70% 40%)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  </div>
);

export function AuraChatPage() {
  const {
    provider, chainId, isConnected, ethersSigner, ethersReadonlyProvider,
    sameChain, sameSigner, initialMockChains,
  } = useMetaMaskEthersSigner();

  const { instance, status: fhevmStatus } = useFhevm({
    provider, chainId, enabled: isConnected, initialMockChains,
  });

  const {
    userAddress, userInfo, messages, isLoading, message: statusMessage,
    register, sendMessage, loadMessages, decryptMessage,
  } = useAuraChat({
    instance, chainId, ethersSigner, ethersReadonlyProvider, sameChain, sameSigner,
  });

  const [nicknameInput, setNicknameInput] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [toast, setToast] = useState<{ title: string; description: string } | null>(null);

  const address = userAddress;
  const isRegistered = userInfo?.isRegistered ?? false;
  const nickname = userInfo?.nickname ?? "";

  const showToast = (title: string, description: string) => {
    setToast({ title, description });
    setTimeout(() => setToast(null), 4000);
  };

  const handleRegister = async () => {
    if (!nicknameInput.trim()) {
      showToast("Error", "Please enter a nickname");
      return;
    }
    const success = await register(nicknameInput.trim());
    if (success) {
      showToast("Success", "Registration successful!");
      setNicknameInput("");
    } else {
      showToast("Error", statusMessage || "Registration failed");
    }
  };

  const handleSendMessage = async () => {
    if (!recipientAddress.trim()) {
      showToast("Error", "Please enter recipient address");
      return;
    }
    if (!messageInput.trim()) {
      showToast("Error", "Please enter a message");
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipientAddress.trim())) {
      showToast("Error", "Invalid address format");
      return;
    }

    const success = await sendMessage(recipientAddress.trim(), messageInput.trim());
    if (success) {
      showToast("Success", "Message sent!");
      setMessageInput("");
    } else {
      showToast("Error", statusMessage || "Send failed");
    }
  };

  const handleDecrypt = async (messageId: number) => {
    const success = await decryptMessage(messageId);
    if (success) {
      showToast("Success", "Message decrypted!");
    } else {
      showToast("Error", statusMessage || "Decrypt failed");
    }
  };

  const isDecryptedByMe = (msg: ChatMessage) => {
    if (msg.sender.toLowerCase() === address?.toLowerCase()) {
      return msg.decryptedBySender;
    }
    return msg.decryptedByRecipient;
  };

  const Toast = () => {
    if (!toast) return null;
    return (
      <div className="fixed bottom-4 right-4 bg-white border border-cyan-200 rounded-lg shadow-lg p-4 max-w-sm z-50 glow-border">
        <h4 className="font-semibold text-cyan-700">{toast.title}</h4>
        <p className="text-sm text-gray-600">{toast.description}</p>
      </div>
    );
  };

  // FHE Status indicator
  const FHEStatus = () => (
    <div className="text-xs text-gray-500">
      FHE: {fhevmStatus === "ready" ? "✓ Ready" : fhevmStatus === "loading" ? "Loading..." : fhevmStatus}
    </div>
  );

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-sm border border-cyan-200 rounded-2xl shadow-xl p-8 glow-border">
          <div className="text-center">
            <div className="mx-auto bg-cyan-100 p-4 rounded-full w-fit mb-6"><Logo /></div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">AuraChat</h1>
            <p className="text-gray-500 mb-6">Connect your wallet to start sending encrypted messages</p>
            <div className="flex justify-center"><ConnectButton /></div>
          </div>
        </div>
        <Toast />
      </div>
    );
  }

  if (!isRegistered) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-sm border border-cyan-200 rounded-2xl shadow-xl p-8 glow-border">
          <div className="text-center">
            <div className="mx-auto bg-cyan-100 p-4 rounded-full w-fit mb-6">
              <User className="h-12 w-12 text-cyan-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Register</h1>
            <p className="text-gray-500 mb-2">Create your account to start chatting</p>
            <p className="text-xs text-gray-400 mb-2">Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
            <FHEStatus />
          </div>
          <div className="space-y-4 mt-4">
            <input type="text" placeholder="Enter your nickname" value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              maxLength={32} />
            <button onClick={handleRegister} disabled={isLoading || !nicknameInput.trim() || fhevmStatus !== "ready"}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors">
              {isLoading ? "Registering..." : "Register"}
            </button>
            <div className="flex justify-center pt-2"><ConnectButton /></div>
          </div>
        </div>
        <Toast />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-cyan-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <h1 className="text-xl font-bold text-gray-800">AuraChat</h1>
              <p className="text-xs text-gray-500">Welcome, {nickname}</p>
              <FHEStatus />
            </div>
          </div>
          <ConnectButton />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Status Message */}
        {statusMessage && (
          <div className="mb-4 p-3 bg-cyan-50 border border-cyan-200 rounded-lg text-sm text-cyan-700">
            {statusMessage}
          </div>
        )}

        {/* Send Message */}
        <div className="mb-6 bg-white/80 backdrop-blur-sm border border-cyan-200 rounded-2xl shadow-lg p-6 glow-border">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
            <Send className="h-5 w-5 text-cyan-600" /> Send Encrypted Message
          </h2>
          <div className="space-y-4">
            <input type="text" placeholder="Recipient address (0x...)" value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm" />
            <input type="text" placeholder="Your message..." value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            <button onClick={handleSendMessage}
              disabled={isLoading || !recipientAddress.trim() || !messageInput.trim() || fhevmStatus !== "ready"}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors">
              {isLoading ? "Sending..." : "Send Message"}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="bg-white/80 backdrop-blur-sm border border-cyan-200 rounded-2xl shadow-lg p-6 glow-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-cyan-600" /> Messages
            </h2>
            <button onClick={loadMessages} disabled={isLoading}
              className="px-4 py-2 border border-cyan-300 text-cyan-600 hover:bg-cyan-50 rounded-lg text-sm font-medium flex items-center gap-2">
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {messages.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No messages yet. Send your first encrypted message!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isSent = msg.sender.toLowerCase() === address?.toLowerCase();
                const decrypted = isDecryptedByMe(msg);
                return (
                  <div key={msg.id} className={`p-4 rounded-xl ${isSent ? "bg-cyan-50 border border-cyan-200 ml-8" : "bg-purple-50 border border-purple-200 mr-8"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {decrypted ? <Unlock className="h-4 w-4 text-green-500" /> : <Lock className="h-4 w-4 text-amber-500" />}
                        <span className="text-xs text-gray-500">
                          {isSent ? "Sent" : "Received"} • {new Date(msg.timestamp * 1000).toLocaleString()}
                        </span>
                      </div>
                      {!decrypted && (
                        <button onClick={() => handleDecrypt(msg.id)} disabled={isLoading}
                          className="px-3 py-1 border border-amber-300 text-amber-600 hover:bg-amber-50 rounded-lg text-xs font-medium">
                          Decrypt
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {isSent ? <>To: {msg.recipient.slice(0, 8)}...{msg.recipient.slice(-6)}</> : <>From: {msg.sender.slice(0, 8)}...{msg.sender.slice(-6)}</>}
                    </p>
                    <div className="font-mono text-sm break-all">
                      {decrypted ? <span className="text-green-600">[Decrypted] {msg.encryptedContent.slice(0, 20)}...</span>
                        : <span className="text-amber-600">[Encrypted] {msg.encryptedContent.slice(0, 20)}...</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Toast />
    </div>
  );
}
