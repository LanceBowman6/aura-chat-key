import { task } from "hardhat/config";

task("registerUser", "Register a user in the EncryptedChat contract")
  .addParam("contract", "The address of the EncryptedChat contract")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const [signer] = await ethers.getSigners();
    
    const EncryptedChat = await ethers.getContractFactory("EncryptedChat");
    const contract = EncryptedChat.attach(taskArgs.contract);
    
    // For demo purposes, we'll use a simple encrypted value
    // In a real implementation, this would be properly encrypted
    const mockPublicKey = ethers.encodeBytes32String("public-key");
    
    try {
      const tx = await contract.registerUser(mockPublicKey);
      await tx.wait();
      console.log(`User registered successfully with address: ${signer.address}`);
    } catch (error) {
      console.error("Error registering user:", error);
    }
  });

task("grantAccess", "Grant access to another user in the EncryptedChat contract (demo signatures)")
  .addParam("contract", "The address of the EncryptedChat contract")
  .addParam("recipient", "The address of the recipient to grant access to")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const [signer] = await ethers.getSigners();
    
    const EncryptedChat = await ethers.getContractFactory("EncryptedChat");
    const contract = EncryptedChat.attach(taskArgs.contract);
    
    try {
      // Read current nonce from contract
      const user = await contract.users(signer.address);
      const nonce = user.nonce;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      // Create digest to sign
      const digest = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode([
        'string','address','uint256','uint256'
      ], [
        'grantAccess', taskArgs.recipient, nonce, deadline
      ]));
      const signature = await signer.signMessage(ethers.getBytes(digest));

      const tx = await contract.grantAccess(taskArgs.recipient, nonce, deadline, signature);
      await tx.wait();
      console.log(`Access granted from ${signer.address} to ${taskArgs.recipient}`);
    } catch (error) {
      console.error("Error granting access:", error);
    }
  });

task("sendMessage", "Send an encrypted message in the EncryptedChat contract (demo signatures)")
  .addParam("contract", "The address of the EncryptedChat contract")
  .addParam("recipient", "The address of the recipient")
  .addParam("message", "The message content (will be encrypted)")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const [signer] = await ethers.getSigners();
    
    const EncryptedChat = await ethers.getContractFactory("EncryptedChat");
    const contract = EncryptedChat.attach(taskArgs.contract);
    
    // For demo purposes, we'll use a simple encrypted value
    // In a real implementation, this would be properly encrypted
    const mockEncryptedMessage = ethers.keccak256(ethers.toUtf8Bytes(taskArgs.message));
    const mockProof = "0x";
    
    try {
      // Read current nonce from contract
      const user = await contract.users(signer.address);
      const nonce = user.nonce;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const digest = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode([
        'string','address','uint256','uint256'
      ], [
        'sendMessage', taskArgs.recipient, nonce, deadline
      ]));
      const signature = await signer.signMessage(ethers.getBytes(digest));

      const tx = await contract.sendMessage(taskArgs.recipient, mockEncryptedMessage, mockProof, nonce, deadline, signature);
      await tx.wait();
      console.log(`Message sent from ${signer.address} to ${taskArgs.recipient}`);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  });

task("getMessageCount", "Get the message count for a user in the EncryptedChat contract")
  .addParam("contract", "The address of the EncryptedChat contract")
  .addOptionalParam("user", "The address to query; defaults to signer")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const [signer] = await ethers.getSigners();
    
    const EncryptedChat = await ethers.getContractFactory("EncryptedChat");
    const contract = EncryptedChat.attach(taskArgs.contract);
    
    try {
      const user = taskArgs.user ?? signer.address;
      const count = await contract.getMessageCountFor(user);
      console.log(`Message count for ${user}: ${count}`);
    } catch (error) {
      console.error("Error getting message count:", error);
    }
  });

task("getMessageMetadata", "Get message metadata without revealing content")
  .addParam("contract", "The address of the EncryptedChat contract")
  .addParam("messageId", "The ID of the message")
  .setAction(async (taskArgs, hre) => {
    const { ethers } = hre;
    const [signer] = await ethers.getSigners();
    
    const EncryptedChat = await ethers.getContractFactory("EncryptedChat");
    const contract = EncryptedChat.attach(taskArgs.contract);
    
    try {
      const metadata = await contract.getMessageMetadata(taskArgs.messageId);
      console.log(`Message metadata for ID ${taskArgs.messageId}:`);
      console.log(`  Sender: ${metadata.sender}`);
      console.log(`  Timestamp: ${metadata.timestamp}`);
      console.log(`  Is Decrypted: ${metadata.isDecrypted}`);
    } catch (error) {
      console.error("Error getting message metadata:", error);
    }
  });
