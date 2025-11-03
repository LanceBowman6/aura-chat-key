// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title A simple FHE counter contract
/// @author fhevm-hardhat-template
/// @notice A very basic example contract showing how to work with encrypted data using FHEVM.
contract FHECounter is SepoliaConfig {
    euint32 private _count;

    /// @notice Returns the current count
    /// @return The current encrypted count
    function getCount() external view returns (euint32) {
        return _count;
    }

    /// @notice Increments the counter by a specified encrypted value.
    /// @param inputEuint32 the encrypted input value
    /// @param inputProof the input proof
    /// @dev Includes overflow protection by checking against maximum safe value
    function increment(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedEuint32 = FHE.fromExternal(inputEuint32, inputProof);
        
        // Create encrypted maximum safe value (2^31 - 1 to prevent overflow)
        euint32 maxSafeValue = FHE.asEuint32(2147483647);
        
        // Check if current count is already at maximum safe value
        ebool isAtMax = FHE.gte(_count, maxSafeValue);
        
        // Only increment if not at maximum
        euint32 newCount = FHE.add(_count, encryptedEuint32);
        _count = FHE.select(isAtMax, _count, newCount);

        FHE.allowThis(_count);
        FHE.allow(_count, msg.sender);
    }

    /// @notice Decrements the counter by a specified encrypted value.
    /// @param inputEuint32 the encrypted input value
    /// @param inputProof the input proof
    /// @dev Includes underflow protection by checking against zero
    function decrement(externalEuint32 inputEuint32, bytes calldata inputProof) external {
        euint32 encryptedEuint32 = FHE.fromExternal(inputEuint32, inputProof);
        
        // Check if decrement would cause underflow
        ebool wouldUnderflow = FHE.lt(_count, encryptedEuint32);
        
        // Only decrement if it won't cause underflow, otherwise set to zero
        euint32 newCount = FHE.sub(_count, encryptedEuint32);
        euint32 zero = FHE.asEuint32(0);
        _count = FHE.select(wouldUnderflow, zero, newCount);

        FHE.allowThis(_count);
        FHE.allow(_count, msg.sender);
    }
}
