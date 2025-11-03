// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title BidVault - simple commit-reveal sealed-bid vault
/// @notice Demo-only, unaudited. Do not use in production.
contract BidVault {
    struct Bid {
        bytes32 hash; // keccak256(amount, salt)
        bool revealed;
        uint256 amount; // revealed amount
        bytes32 salt;   // revealed salt
    }

    mapping(address => Bid) public bids;

    event BidCommitted(address indexed bidder, bytes32 hash);
    event BidRevealed(address indexed bidder, uint256 amount);
    event BidCancelled(address indexed bidder);

    error AlreadyCommitted();
    error NoCommit();
    error HashMismatch();
    error AlreadyRevealed();
    error ZeroHash();

    /// @notice Commit a bid hash (keccak256(amount, salt))
    function commitBid(bytes32 hash) external {
        if (hash == bytes32(0)) revert ZeroHash();
        if (bids[msg.sender].hash != bytes32(0)) revert AlreadyCommitted();
        bids[msg.sender].hash = hash;
        emit BidCommitted(msg.sender, hash);
    }

    /// @notice Reveal your bid amount and salt to match the committed hash
    function revealBid(uint256 amount, bytes32 salt) external {
        Bid storage b = bids[msg.sender];
        if (b.hash == bytes32(0)) revert NoCommit();
        if (b.revealed) revert AlreadyRevealed();
        bytes32 expectHash = keccak256(abi.encodePacked(amount, salt));
        if (expectHash != b.hash) revert HashMismatch();
        b.revealed = true;
        b.amount = amount;
        b.salt = salt;
        emit BidRevealed(msg.sender, amount);
    }

    /// @notice Helper to check if an address has revealed their bid
    function hasRevealed(address bidder) external view returns (bool) {
        return bids[bidder].revealed;
    }

    /// @notice Whether an address has an active commitment
    function isCommitted(address bidder) external view returns (bool) {
        return bids[bidder].hash != bytes32(0) && !bids[bidder].revealed;
    }

    /// @notice Lightweight view into a bidder's commitment and status
    function commitOf(address bidder) external view returns (bytes32 hash, bool revealed) {
        Bid storage b = bids[bidder];
        return (b.hash, b.revealed);
    }

    /// @notice Return only the committed hash for a bidder (zero if none)
    function bidHashOf(address bidder) external view returns (bytes32) {
        return bids[bidder].hash;
    }

    /// @notice Cancel an existing commitment if not yet revealed
    function cancelCommit() external {
        Bid storage b = bids[msg.sender];
        if (b.hash == bytes32(0)) revert NoCommit();
        if (b.revealed) revert AlreadyRevealed();
        delete bids[msg.sender];
        emit BidCancelled(msg.sender);
    }

    /// @notice Inspect revealed bid values (amount, salt). Returns zeros if not revealed.
    function getReveal(address bidder) external view returns (uint256 amount, bytes32 salt) {
        Bid storage b = bids[bidder];
        if (!b.revealed) return (0, bytes32(0));
        return (b.amount, b.salt);
    }

    /// @notice Contract version for basic introspection
    function version() external pure returns (string memory) {
        return "1.0.1";
    }
}
