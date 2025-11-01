// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// NOTE: For the demo path we temporarily relax FHE requirements.
// import {FHE, euint32, euint64, ebool, externalEuint32, externalEuint64, externalEbool} from "@fhevm/solidity/lib/FHE.sol";
// import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title Encrypted Chat Contract with Authentication
/// @author aura-chat-key
/// @notice A contract for sending and receiving encrypted messages using FHEVM with wallet authentication.
contract EncryptedChat is SepoliaConfig {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    
    struct Message {
        address sender;
        bytes32 encryptedContent; // Encrypted message content (demo: raw bytes32)
        uint256 timestamp;
        bool isDecrypted; // Track if message has been decrypted by recipient
        bytes32 messageHash; // Hash of the original message for integrity verification
    }
    
    struct User {
        bool isRegistered;
        bytes32 publicKey; // Demo: store raw bytes32 instead of encrypted euint32
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
    mapping(address => AuthSession) public authSessions; // User authentication sessions
    
    uint256 public messageCount;
    uint256 public constant SESSION_DURATION = 24 hours; // 24-hour session duration
    
    event MessageSent(address indexed sender, address indexed recipient, uint256 messageId);
    event UserRegistered(address indexed user);
    event AccessGranted(address indexed owner, address indexed recipient);
    event SessionCreated(address indexed user, uint256 expiresAt);
    event MessageDecrypted(address indexed user, uint256 messageId);
    
    /// @notice Register a new user with their public key
    /// @param publicKey The user's public key (demo: bytes32)
    function registerUser(bytes32 publicKey) external {
        require(!users[msg.sender].isRegistered, "User already registered");
        
        // Initialize storage struct fields individually (struct contains a mapping)
        User storage u = users[msg.sender];
        u.isRegistered = true;
        u.publicKey = publicKey;
        u.nonce = 0;
        
        emit UserRegistered(msg.sender);
    }
    
    /// @notice Create an authentication session with signature verification
    /// @param message The original message that was signed
    /// @param signature The signature of the message
    /// @param expiresAt The expiration time for the session
    function createSession(string calldata message, bytes calldata signature, uint256 expiresAt) external {
        require(users[msg.sender].isRegistered, "User not registered");
        require(expiresAt > block.timestamp, "Invalid expiration time");
        require(expiresAt <= block.timestamp + SESSION_DURATION, "Expiration too far in future");
        
        // Verify the signature
        bytes32 messageHash = keccak256(abi.encodePacked(message));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);
        
        require(signer == msg.sender, "Invalid signature");
        require(!users[msg.sender].usedSignatures[ethSignedMessageHash], "Signature already used");
        
        // Mark signature as used to prevent replay attacks
        users[msg.sender].usedSignatures[ethSignedMessageHash] = true;
        users[msg.sender].nonce++;
        
        // Create or update session
        authSessions[msg.sender] = AuthSession({
            user: msg.sender,
            expiresAt: expiresAt,
            messageHash: messageHash,
            isValid: true
        });
        
        emit SessionCreated(msg.sender, expiresAt);
    }
    
    /// @notice Check if a user has a valid authentication session
    /// @param user The user address to check
    /// @return True if the user has a valid session, false otherwise
    function hasValidSession(address user) external view returns (bool) {
        AuthSession storage session = authSessions[user];
        return session.isValid && session.expiresAt > block.timestamp;
    }
    
    /// @notice Grant another user permission to decrypt your messages
    /// @param recipient The address to grant access to
    /// @param signature Signature to verify the request
    function grantAccess(address recipient, uint256 nonce, uint256 deadline, bytes calldata signature) external {
        require(users[msg.sender].isRegistered, "Not registered");
        require(users[recipient].isRegistered, "Recipient not registered");
        require(msg.sender != recipient, "Cannot grant access to yourself");
        require(_hasValidSession(msg.sender), "Authentication required");
        require(block.timestamp <= deadline, "Signature expired");
        require(nonce == users[msg.sender].nonce, "Invalid nonce");
        
        // Verify signature for additional security with nonce+deadline
        bytes32 messageHash = keccak256(abi.encodePacked("grantAccess", recipient, nonce, deadline));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);
        
        require(signer == msg.sender, "Invalid signature");
        require(!users[msg.sender].usedSignatures[ethSignedMessageHash], "Signature already used");
        users[msg.sender].usedSignatures[ethSignedMessageHash] = true;
        users[msg.sender].nonce++;
        
        accessList[msg.sender][recipient] = true;
        emit AccessGranted(msg.sender, recipient);
    }
    
    /// @notice Send an encrypted message to a recipient with authentication
    /// @param recipient The recipient's address
    /// @param encryptedContent The encrypted message content
    /// @param contentProof The proof for the encrypted content
    /// @param signature Signature to verify the request
    function sendMessage(
        address recipient,
        bytes32 encryptedContent,
        bytes calldata contentProof,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(users[msg.sender].isRegistered, "Sender not registered");
        require(users[recipient].isRegistered, "Recipient not registered");
        // Allow self-send for local/demo flows without prior grant
        require(accessList[msg.sender][recipient] || msg.sender == recipient, "No access granted");
        require(_hasValidSession(msg.sender), "Authentication required");
        require(block.timestamp <= deadline, "Signature expired");
        require(nonce == users[msg.sender].nonce, "Invalid nonce");
        
        // Verify signature for additional security with nonce+deadline
        bytes32 messageHash = keccak256(abi.encodePacked("sendMessage", recipient, nonce, deadline));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);
        
        require(signer == msg.sender, "Invalid signature");
        require(!users[msg.sender].usedSignatures[ethSignedMessageHash], "Signature already used");
        users[msg.sender].usedSignatures[ethSignedMessageHash] = true;
        users[msg.sender].nonce++;
        
        // Create hash of the encrypted content for integrity verification
        bytes32 contentHash = keccak256(abi.encodePacked(encryptedContent, contentProof));
        
        Message memory newMessage = Message({
            sender: msg.sender,
            encryptedContent: encryptedContent,
            timestamp: block.timestamp,
            isDecrypted: false,
            messageHash: contentHash
        });
        
        messages[recipient].push(newMessage);
        messageCount++;
        
        emit MessageSent(msg.sender, recipient, messages[recipient].length - 1);
    }
    
    /// @notice Decrypt a message with authentication
    /// @param messageId The ID of the message to decrypt
    /// @param signature Signature to verify the request
    function decryptMessage(uint256 messageId, uint256 nonce, uint256 deadline, bytes calldata signature) external {
        require(messageId < messages[msg.sender].length, "Invalid message ID");
        require(_hasValidSession(msg.sender), "Authentication required");
        require(block.timestamp <= deadline, "Signature expired");
        require(nonce == users[msg.sender].nonce, "Invalid nonce");
        
        // Verify signature for additional security with nonce+deadline
        bytes32 messageHash = keccak256(abi.encodePacked("decryptMessage", messageId, nonce, deadline));
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);
        
        require(signer == msg.sender, "Invalid signature");
        require(!users[msg.sender].usedSignatures[ethSignedMessageHash], "Signature already used");
        users[msg.sender].usedSignatures[ethSignedMessageHash] = true;
        users[msg.sender].nonce++;
        
        messages[msg.sender][messageId].isDecrypted = true;
        emit MessageDecrypted(msg.sender, messageId);
    }
    
    /// @notice Get the encrypted message content
    /// @param messageId The ID of the message in the user's message array
    /// @return The encrypted message content
    /// @dev 需要有效会话才能获取加密内容
    function getEncryptedMessage(uint256 messageId) external view returns (bytes32) {
        require(messageId < messages[msg.sender].length, "Invalid message ID");
        require(_hasValidSession(msg.sender), "Authentication required");
        return messages[msg.sender][messageId].encryptedContent;
    }

    /// @notice Get the number of messages for a user
    /// @return The number of messages
    /// @dev 不需要会话验证 - 任何人都可以查看自己的消息数量
    function getMessageCount() external view returns (uint256) {
        return messages[msg.sender].length;
    }

    /// @notice Get message metadata without revealing content
    /// @param messageId The ID of the message
    /// @return sender The sender's address
    /// @return timestamp The timestamp when the message was sent
    /// @return isDecrypted Whether the message has been decrypted
    /// @dev 不需要会话验证 - 元数据不包含敏感的加密内容
    function getMessageMetadata(uint256 messageId) external view returns (address sender, uint256 timestamp, bool isDecrypted) {
        require(messageId < messages[msg.sender].length, "Invalid message ID");
        Message storage message = messages[msg.sender][messageId];
        return (message.sender, message.timestamp, message.isDecrypted);
    }
    
    /// @notice Internal function to check if a user has a valid session
    /// @param user The user address to check
    /// @return True if the user has a valid session, false otherwise
    function _hasValidSession(address user) internal view returns (bool) {
        AuthSession storage session = authSessions[user];
        return session.isValid && session.expiresAt > block.timestamp;
    }
    
    /// @notice Revoke an authentication session
    function revokeSession() external {
        authSessions[msg.sender].isValid = false;
    }
}
