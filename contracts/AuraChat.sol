// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title AuraChat - Encrypted P2P Messaging on FHEVM
/// @author aura-chat-key
/// @notice A peer-to-peer encrypted messaging contract using FHE for message content encryption
contract AuraChat is SepoliaConfig {
    // ========== STRUCTS ==========
    struct User {
        bool isRegistered;
        string nickname;
        uint256 messageCount;
    }

    struct Message {
        address sender;
        address recipient;
        euint32 encryptedContent; // FHE encrypted message content (as uint32 for demo)
        uint256 timestamp;
        bool decryptedBySender;
        bool decryptedByRecipient;
    }

    // ========== STATE ==========
    mapping(address => User) public users;
    mapping(uint256 => Message) private messages;
    mapping(address => uint256[]) private sentMessages;
    mapping(address => uint256[]) private receivedMessages;

    uint256 public totalUsers;
    uint256 public totalMessages;

    // ========== EVENTS ==========
    event UserRegistered(address indexed user, string nickname);
    event MessageSent(address indexed sender, address indexed recipient, uint256 messageId, uint256 timestamp);
    event MessageDecrypted(address indexed user, uint256 messageId);

    // ========== ERRORS ==========
    error NotRegistered();
    error AlreadyRegistered();
    error RecipientNotRegistered();
    error CannotSendToYourself();
    error InvalidNickname();
    error AlreadyDecrypted();
    error NotAuthorized();
    error InvalidMessageId();

    // ========== MODIFIERS ==========
    modifier onlyRegistered() {
        if (!users[msg.sender].isRegistered) revert NotRegistered();
        _;
    }

    // ========== USER FUNCTIONS ==========

    /// @notice Register a new user with a nickname
    /// @param nickname The user's display name (1-32 characters)
    function register(string calldata nickname) external {
        if (users[msg.sender].isRegistered) revert AlreadyRegistered();
        if (bytes(nickname).length == 0 || bytes(nickname).length > 32) revert InvalidNickname();

        users[msg.sender] = User({
            isRegistered: true,
            nickname: nickname,
            messageCount: 0
        });

        totalUsers++;
        emit UserRegistered(msg.sender, nickname);
    }

    /// @notice Check if a user is registered
    /// @param user The address to check
    /// @return True if the user is registered
    function isUserRegistered(address user) external view returns (bool) {
        return users[user].isRegistered;
    }

    /// @notice Get user information
    /// @param user The address to query
    /// @return isRegistered Whether the user is registered
    /// @return nickname The user's nickname
    /// @return messageCount The user's total message count
    function getUserInfo(address user) external view returns (
        bool isRegistered,
        string memory nickname,
        uint256 messageCount
    ) {
        User storage u = users[user];
        return (u.isRegistered, u.nickname, u.messageCount);
    }

    // ========== MESSAGING FUNCTIONS ==========

    /// @notice Send an encrypted message to another user
    /// @param recipient The recipient's address
    /// @param inputEuint32 The FHE encrypted message content
    /// @param inputProof The encryption proof
    function sendMessage(
        address recipient,
        externalEuint32 inputEuint32,
        bytes calldata inputProof
    ) external onlyRegistered {
        if (!users[recipient].isRegistered) revert RecipientNotRegistered();
        if (recipient == msg.sender) revert CannotSendToYourself();

        // Convert external encrypted input to internal FHE type
        euint32 encryptedContent = FHE.fromExternal(inputEuint32, inputProof);

        uint256 messageId = totalMessages++;

        messages[messageId] = Message({
            sender: msg.sender,
            recipient: recipient,
            encryptedContent: encryptedContent,
            timestamp: block.timestamp,
            decryptedBySender: false,
            decryptedByRecipient: false
        });

        sentMessages[msg.sender].push(messageId);
        receivedMessages[recipient].push(messageId);

        users[msg.sender].messageCount++;
        users[recipient].messageCount++;

        // Allow the contract to access the encrypted content
        FHE.allowThis(encryptedContent);
        // Allow sender and recipient to access the encrypted content
        FHE.allow(encryptedContent, msg.sender);
        FHE.allow(encryptedContent, recipient);

        emit MessageSent(msg.sender, recipient, messageId, block.timestamp);
    }

    /// @notice Mark a message as decrypted by the caller
    /// @param messageId The ID of the message to mark as decrypted
    function decryptMessage(uint256 messageId) external onlyRegistered {
        if (messageId >= totalMessages) revert InvalidMessageId();

        Message storage msg_ = messages[messageId];
        
        if (msg_.sender == msg.sender) {
            if (msg_.decryptedBySender) revert AlreadyDecrypted();
            msg_.decryptedBySender = true;
        } else if (msg_.recipient == msg.sender) {
            if (msg_.decryptedByRecipient) revert AlreadyDecrypted();
            msg_.decryptedByRecipient = true;
        } else {
            revert NotAuthorized();
        }

        emit MessageDecrypted(msg.sender, messageId);
    }

    // ========== READ FUNCTIONS ==========

    /// @notice Get a single message by ID (only sender or recipient can access)
    /// @param messageId The ID of the message
    /// @return sender The message sender
    /// @return recipient The message recipient
    /// @return encryptedContent The FHE encrypted content handle
    /// @return timestamp The message timestamp
    /// @return decryptedBySender Whether sender has marked it decrypted
    /// @return decryptedByRecipient Whether recipient has marked it decrypted
    function getMessage(uint256 messageId) external view returns (
        address sender,
        address recipient,
        euint32 encryptedContent,
        uint256 timestamp,
        bool decryptedBySender,
        bool decryptedByRecipient
    ) {
        if (messageId >= totalMessages) revert InvalidMessageId();
        Message storage msg_ = messages[messageId];
        
        // Only sender or recipient can access message details
        if (msg_.sender != msg.sender && msg_.recipient != msg.sender) {
            revert NotAuthorized();
        }
        
        return (
            msg_.sender,
            msg_.recipient,
            msg_.encryptedContent,
            msg_.timestamp,
            msg_.decryptedBySender,
            msg_.decryptedByRecipient
        );
    }

    /// @notice Get IDs of messages sent by a user
    /// @param user The sender's address
    /// @return Array of message IDs
    function getSentMessageIds(address user) external view returns (uint256[] memory) {
        return sentMessages[user];
    }

    /// @notice Get IDs of messages received by a user
    /// @param user The recipient's address
    /// @return Array of message IDs
    function getReceivedMessageIds(address user) external view returns (uint256[] memory) {
        return receivedMessages[user];
    }

    /// @notice Get multiple messages at once (only accessible to authorized users)
    /// @param messageIds Array of message IDs to fetch
    /// @return senders Array of sender addresses
    /// @return recipients Array of recipient addresses
    /// @return contents Array of encrypted content handles
    /// @return timestamps Array of timestamps
    /// @return decryptedBySenders Array of sender decryption status
    /// @return decryptedByRecipients Array of recipient decryption status
    function getMessages(uint256[] calldata messageIds) external view returns (
        address[] memory senders,
        address[] memory recipients,
        euint32[] memory contents,
        uint256[] memory timestamps,
        bool[] memory decryptedBySenders,
        bool[] memory decryptedByRecipients
    ) {
        uint256 len = messageIds.length;
        require(len > 0 && len <= 100, "Invalid batch size"); // Prevent DoS attacks
        
        senders = new address[](len);
        recipients = new address[](len);
        contents = new euint32[](len);
        timestamps = new uint256[](len);
        decryptedBySenders = new bool[](len);
        decryptedByRecipients = new bool[](len);

        for (uint256 i = 0; i < len; i++) {
            uint256 id = messageIds[i];
            if (id >= totalMessages) revert InvalidMessageId();
            
            Message storage msg_ = messages[id];
            
            // Only sender or recipient can access message details
            if (msg_.sender != msg.sender && msg_.recipient != msg.sender) {
                revert NotAuthorized();
            }
            
            senders[i] = msg_.sender;
            recipients[i] = msg_.recipient;
            contents[i] = msg_.encryptedContent;
            timestamps[i] = msg_.timestamp;
            decryptedBySenders[i] = msg_.decryptedBySender;
            decryptedByRecipients[i] = msg_.decryptedByRecipient;
        }
    }
}
