// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, euint64, ebool, externalEuint32, externalEuint64, externalEbool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Encrypted Chat Contract
/// @author aura-chat-key
/// @notice A contract for sending and receiving encrypted messages using FHEVM.
contract EncryptedChat is SepoliaConfig {
    struct Message {
        address sender;
        euint64 encryptedContent; // Encrypted message content
        uint256 timestamp;
        bool isDecrypted; // Track if message has been decrypted by recipient
        bytes32 messageHash; // Hash of the original message for integrity verification
    }
    
    struct User {
        bool isRegistered;
        euint32 publicKey; // Simplified public key for demo purposes
        uint256 nonce; // Nonce for replay protection
        mapping(bytes32 => bool) usedSignatures; // Track used signatures to prevent replay attacks
    }
    
    struct AuthSession {
        address user;
        uint256 expiresAt; // Expiration timestamp
        bytes32 messageHash; // Hash of the original authentication message
        bool isValid;
    }
    
    mapping(address => User) public users;
    mapping(address => Message[]) public messages;
    mapping(address => mapping(address => bool)) public accessList; // Who can decrypt messages from whom
    
    uint256 public messageCount;
    
    event MessageSent(address indexed sender, address indexed recipient, uint256 messageId);
    event MessageDecrypted(address indexed recipient, uint256 messageId, uint256 timestamp);
    event UserRegistered(address indexed user);
    event AccessGranted(address indexed owner, address indexed recipient);
    
    /// @notice Register a new user with their public key
    /// @param publicKey The user's public key (encrypted)
    function registerUser(externalEuint32 publicKey, bytes calldata publicKeyProof) external {
        require(!users[msg.sender].isRegistered, "User already registered");
        
        euint32 encryptedPublicKey = FHE.fromExternal(publicKey, publicKeyProof);
        // Initialize storage struct fields individually (struct contains a mapping)
        User storage u = users[msg.sender];
        u.isRegistered = true;
        u.publicKey = encryptedPublicKey;
        u.nonce = 0;
        
        FHE.allowThis(users[msg.sender].publicKey);
        FHE.allow(users[msg.sender].publicKey, msg.sender);
        
        emit UserRegistered(msg.sender);
    }
    
    /// @notice Grant another user permission to decrypt your messages
    /// @param recipient The address to grant access to
    function grantAccess(address recipient) external {
        require(users[msg.sender].isRegistered, "Not registered");
        require(users[recipient].isRegistered, "Recipient not registered");
        require(msg.sender != recipient, "Cannot grant access to yourself");
        
        accessList[msg.sender][recipient] = true;
        emit AccessGranted(msg.sender, recipient);
    }
    
    /// @notice Send an encrypted message to a recipient
    /// @param recipient The recipient's address
    /// @param encryptedContent The encrypted message content
    /// @param contentProof The proof for the encrypted content
    function sendMessage(
        address recipient,
        externalEuint64 encryptedContent,
        bytes calldata contentProof
    ) external {
        require(users[msg.sender].isRegistered, "Sender not registered");
        require(users[recipient].isRegistered, "Recipient not registered");
        require(accessList[msg.sender][recipient], "No access granted");
        
        euint64 content = FHE.fromExternal(encryptedContent, contentProof);
        
        // Create hash of the encrypted content for integrity verification
        bytes32 contentHash = keccak256(abi.encodePacked(encryptedContent, contentProof));

        Message memory newMessage = Message({
            sender: msg.sender,
            encryptedContent: content,
            timestamp: block.timestamp,
            isDecrypted: false,
            messageHash: contentHash
        });
        
        messages[recipient].push(newMessage);
        messageCount++;
        
        FHE.allowThis(newMessage.encryptedContent);
        FHE.allow(newMessage.encryptedContent, recipient);
        
        emit MessageSent(msg.sender, recipient, messages[recipient].length - 1);
    }
    
    /// @notice Get the encrypted message content
    /// @param messageId The ID of the message in the user's message array
    /// @return The encrypted message content
    function getEncryptedMessage(uint256 messageId) external view returns (euint64) {
        require(messageId < messages[msg.sender].length, "Invalid message ID");
        return messages[msg.sender][messageId].encryptedContent;
    }
    
    /// @notice Get the number of messages for a user
    /// @return The number of messages
    function getMessageCount() external view returns (uint256) {
        return messages[msg.sender].length;
    }
    
    /// @notice Get message metadata without revealing content
    /// @param messageId The ID of the message
    /// @return sender The sender's address
    /// @return timestamp The timestamp when the message was sent
    /// @return isDecrypted Whether the message has been decrypted
    function getMessageMetadata(uint256 messageId) external view returns (address sender, uint256 timestamp, bool isDecrypted) {
        require(messageId < messages[msg.sender].length, "Invalid message ID");
        Message storage message = messages[msg.sender][messageId];
        return (message.sender, message.timestamp, message.isDecrypted);
    }
    
    /// @notice Mark a message as decrypted
    /// @param messageId The ID of the message to mark as decrypted
    function markAsDecrypted(uint256 messageId) external {
        require(messageId < messages[msg.sender].length, "Invalid message ID");
        messages[msg.sender][messageId].isDecrypted = true;
        emit MessageDecrypted(msg.sender, messageId, block.timestamp);
    }
}
