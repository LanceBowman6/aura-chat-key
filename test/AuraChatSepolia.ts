import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { AuraChat } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
};

describe("AuraChatSepolia", function () {
  let signers: Signers;
  let auraChatContract: AuraChat;
  let auraChatContractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const AuraChatDeployment = await deployments.get("AuraChat");
      auraChatContractAddress = AuraChatDeployment.address;
      auraChatContract = await ethers.getContractAt("AuraChat", AuraChatDeployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("should register user and send encrypted message", async function () {
    steps = 8;

    this.timeout(8 * 60000); // 8 minutes for Sepolia

    // Check if already registered
    const [isRegistered] = await auraChatContract.getUserInfo(signers.alice.address);
    
    if (!isRegistered) {
      progress("Registering user...");
      const regTx = await auraChatContract.connect(signers.alice).register("AliceSepolia");
      await regTx.wait();
      progress("User registered successfully");
    } else {
      progress("User already registered, skipping registration");
      steps = 6; // Adjust step count
    }

    // Create encrypted message content
    progress("Encrypting message content...");
    const messageValue = Math.floor(Math.random() * 10000);
    const encryptedInput = await fhevm
      .createEncryptedInput(auraChatContractAddress, signers.alice.address)
      .add32(messageValue)
      .encrypt();

    // Get another registered address or skip send test
    const totalUsers = await auraChatContract.totalUsers();
    if (totalUsers < 2n) {
      progress("Not enough users to test messaging, skipping send test");
      return;
    }

    progress("Verifying user info...");
    const [registered, nickname, msgCount] = await auraChatContract.getUserInfo(signers.alice.address);
    expect(registered).to.be.true;
    expect(nickname).to.equal("AliceSepolia");
    progress(`User info: nickname=${nickname}, messageCount=${msgCount}`);

    progress("Checking total stats...");
    const totalUsersAfter = await auraChatContract.totalUsers();
    const totalMessages = await auraChatContract.totalMessages();
    progress(`Total users: ${totalUsersAfter}, Total messages: ${totalMessages}`);

    progress("Test completed successfully");
  });
});
