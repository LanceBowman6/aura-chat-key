import type { Address } from "viem";

export const AURA_CHAT_ABI = [
  // Registration
  {
    name: "register",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "nickname", type: "string" }],
    outputs: [],
  },
  {
    name: "isUserRegistered",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "getUserInfo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "isRegistered", type: "bool" },
      { name: "nickname", type: "string" },
      { name: "messageCount", type: "uint256" },
    ],
  },
  // Messaging with FHE
  {
    name: "sendMessage",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "inputEuint32", type: "bytes32" },
      { name: "inputProof", type: "bytes" },
    ],
    outputs: [],
  },
  {
    name: "decryptMessage",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "messageId", type: "uint256" }],
    outputs: [],
  },
  // Read functions
  {
    name: "getMessage",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "messageId", type: "uint256" }],
    outputs: [
      { name: "sender", type: "address" },
      { name: "recipient", type: "address" },
      { name: "encryptedContent", type: "bytes32" },
      { name: "timestamp", type: "uint256" },
      { name: "decryptedBySender", type: "bool" },
      { name: "decryptedByRecipient", type: "bool" },
    ],
  },
  {
    name: "getSentMessageIds",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "getReceivedMessageIds",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    name: "getMessages",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "messageIds", type: "uint256[]" }],
    outputs: [
      { name: "senders", type: "address[]" },
      { name: "recipients", type: "address[]" },
      { name: "contents", type: "bytes32[]" },
      { name: "timestamps", type: "uint256[]" },
      { name: "decryptedBySenders", type: "bool[]" },
      { name: "decryptedByRecipients", type: "bool[]" },
    ],
  },
  {
    name: "users",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "isRegistered", type: "bool" },
      { name: "nickname", type: "string" },
      { name: "messageCount", type: "uint256" },
    ],
  },
  {
    name: "totalUsers",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "totalMessages",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // Events
  {
    name: "UserRegistered",
    type: "event",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "nickname", type: "string", indexed: false },
    ],
  },
  {
    name: "MessageSent",
    type: "event",
    inputs: [
      { name: "sender", type: "address", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "messageId", type: "uint256", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
  {
    name: "MessageDecrypted",
    type: "event",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "messageId", type: "uint256", indexed: false },
    ],
  },
] as const;

export function getAuraChatAddress(chainId?: number): Address | undefined {
  if (chainId === 31337) {
    return (process.env.NEXT_PUBLIC_AURA_CHAT_ADDRESS_31337 ||
      process.env.NEXT_PUBLIC_AURA_CHAT_ADDRESS ||
      "0x5FbDB2315678afecb367f032d93F642f64180aa3") as Address;
  }
  if (chainId === 11155111) {
    return process.env.NEXT_PUBLIC_AURA_CHAT_ADDRESS_11155111 as Address | undefined;
  }
  return process.env.NEXT_PUBLIC_AURA_CHAT_ADDRESS as Address | undefined;
}
