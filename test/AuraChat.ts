import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { AuraChat, AuraChat__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("AuraChat")) as AuraChat__factory;
  const auraChatContract = (await factory.deploy()) as AuraChat;
  const auraChatContractAddress = await auraChatContract.getAddress();

  return { auraChatContract, auraChatContractAddress };
}

describe("AuraChat", function () {
  let signers: Signers;
  let auraChatContract: AuraChat;
  let auraChatContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ auraChatContract, auraChatContractAddress } = await deployFixture());
  });

  describe("Registration", function () {
    it("should allow a user to register with a valid nickname", async function () {
      await expect(auraChatContract.connect(signers.alice).register("Alice"))
        .to.emit(auraChatContract, "UserRegistered")
        .withArgs(signers.alice.address, "Alice");

      const [isRegistered, nickname, messageCount] = await auraChatContract.getUserInfo(signers.alice.address);
      expect(isRegistered).to.be.true;
      expect(nickname).to.equal("Alice");
      expect(messageCount).to.equal(0);
    });

    it("should reject registration with empty nickname", async function () {
      await expect(auraChatContract.connect(signers.alice).register(""))
        .to.be.revertedWithCustomError(auraChatContract, "InvalidNickname");
    });

    it("should reject registration with nickname exceeding 32 characters", async function () {
      const longNickname = "A".repeat(33);
      await expect(auraChatContract.connect(signers.alice).register(longNickname))
        .to.be.revertedWithCustomError(auraChatContract, "InvalidNickname");
    });

    it("should reject double registration", async function () {
      await auraChatContract.connect(signers.alice).register("Alice");
      await expect(auraChatContract.connect(signers.alice).register("Alice2"))
        .to.be.revertedWithCustomError(auraChatContract, "AlreadyRegistered");
    });

    it("should correctly track total users", async function () {
      expect(await auraChatContract.totalUsers()).to.equal(0);
      
      await auraChatContract.connect(signers.alice).register("Alice");
      expect(await auraChatContract.totalUsers()).to.equal(1);
      
      await auraChatContract.connect(signers.bob).register("Bob");
      expect(await auraChatContract.totalUsers()).to.equal(2);
    });
  });

  describe("Messaging", function () {
    beforeEach(async function () {
      // Register both users before messaging tests
      await auraChatContract.connect(signers.alice).register("Alice");
      await auraChatContract.connect(signers.bob).register("Bob");
    });

    it("should allow sending an encrypted message between registered users", async function () {
      // Create encrypted message content (just a number for demo)
      const messageValue = 12345;
      const encryptedInput = await fhevm
        .createEncryptedInput(auraChatContractAddress, signers.alice.address)
        .add32(messageValue)
        .encrypt();

      await expect(
        auraChatContract
          .connect(signers.alice)
          .sendMessage(signers.bob.address, encryptedInput.handles[0], encryptedInput.inputProof)
      )
        .to.emit(auraChatContract, "MessageSent")
        .withArgs(signers.alice.address, signers.bob.address, 0, (timestamp: bigint) => timestamp > 0n);

      expect(await auraChatContract.totalMessages()).to.equal(1);

      // Check sent messages for Alice
      const aliceSent = await auraChatContract.getSentMessageIds(signers.alice.address);
      expect(aliceSent.length).to.equal(1);
      expect(aliceSent[0]).to.equal(0);

      // Check received messages for Bob
      const bobReceived = await auraChatContract.getReceivedMessageIds(signers.bob.address);
      expect(bobReceived.length).to.equal(1);
      expect(bobReceived[0]).to.equal(0);
    });

    it("should reject sending to unregistered recipient", async function () {
      const messageValue = 12345;
      const encryptedInput = await fhevm
        .createEncryptedInput(auraChatContractAddress, signers.alice.address)
        .add32(messageValue)
        .encrypt();

      await expect(
        auraChatContract
          .connect(signers.alice)
          .sendMessage(signers.deployer.address, encryptedInput.handles[0], encryptedInput.inputProof)
      ).to.be.revertedWithCustomError(auraChatContract, "RecipientNotRegistered");
    });

    it("should reject sending to self", async function () {
      const messageValue = 12345;
      const encryptedInput = await fhevm
        .createEncryptedInput(auraChatContractAddress, signers.alice.address)
        .add32(messageValue)
        .encrypt();

      await expect(
        auraChatContract
          .connect(signers.alice)
          .sendMessage(signers.alice.address, encryptedInput.handles[0], encryptedInput.inputProof)
      ).to.be.revertedWithCustomError(auraChatContract, "CannotSendToYourself");
    });

    it("should reject sending from unregistered user", async function () {
      const messageValue = 12345;
      const encryptedInput = await fhevm
        .createEncryptedInput(auraChatContractAddress, signers.deployer.address)
        .add32(messageValue)
        .encrypt();

      await expect(
        auraChatContract
          .connect(signers.deployer)
          .sendMessage(signers.bob.address, encryptedInput.handles[0], encryptedInput.inputProof)
      ).to.be.revertedWithCustomError(auraChatContract, "NotRegistered");
    });
  });

  describe("Message Decryption", function () {
    beforeEach(async function () {
      // Register users and send a message
      await auraChatContract.connect(signers.alice).register("Alice");
      await auraChatContract.connect(signers.bob).register("Bob");

      const messageValue = 12345;
      const encryptedInput = await fhevm
        .createEncryptedInput(auraChatContractAddress, signers.alice.address)
        .add32(messageValue)
        .encrypt();

      await auraChatContract
        .connect(signers.alice)
        .sendMessage(signers.bob.address, encryptedInput.handles[0], encryptedInput.inputProof);
    });

    it("should allow sender to mark message as decrypted", async function () {
      await expect(auraChatContract.connect(signers.alice).decryptMessage(0))
        .to.emit(auraChatContract, "MessageDecrypted")
        .withArgs(signers.alice.address, 0);

      const [, , , , decryptedBySender, decryptedByRecipient] = await auraChatContract.getMessage(0);
      expect(decryptedBySender).to.be.true;
      expect(decryptedByRecipient).to.be.false;
    });

    it("should allow recipient to mark message as decrypted", async function () {
      await expect(auraChatContract.connect(signers.bob).decryptMessage(0))
        .to.emit(auraChatContract, "MessageDecrypted")
        .withArgs(signers.bob.address, 0);

      const [, , , , decryptedBySender, decryptedByRecipient] = await auraChatContract.getMessage(0);
      expect(decryptedBySender).to.be.false;
      expect(decryptedByRecipient).to.be.true;
    });

    it("should reject double decryption by same party", async function () {
      await auraChatContract.connect(signers.alice).decryptMessage(0);
      await expect(auraChatContract.connect(signers.alice).decryptMessage(0))
        .to.be.revertedWithCustomError(auraChatContract, "AlreadyDecrypted");
    });

    it("should reject decryption by unauthorized user", async function () {
      await expect(auraChatContract.connect(signers.deployer).decryptMessage(0))
        .to.be.revertedWithCustomError(auraChatContract, "NotRegistered");
    });

    it("should reject decryption of invalid message ID", async function () {
      await expect(auraChatContract.connect(signers.alice).decryptMessage(999))
        .to.be.revertedWithCustomError(auraChatContract, "InvalidMessageId");
    });
  });

  describe("Batch Message Retrieval", function () {
    beforeEach(async function () {
      // Register users and send multiple messages
      await auraChatContract.connect(signers.alice).register("Alice");
      await auraChatContract.connect(signers.bob).register("Bob");

      // Send 3 messages
      for (let i = 0; i < 3; i++) {
        const encryptedInput = await fhevm
          .createEncryptedInput(auraChatContractAddress, signers.alice.address)
          .add32(i + 1)
          .encrypt();

        await auraChatContract
          .connect(signers.alice)
          .sendMessage(signers.bob.address, encryptedInput.handles[0], encryptedInput.inputProof);
      }
    });

    it("should retrieve multiple messages correctly", async function () {
      const [senders, recipients, , timestamps, decryptedBySenders, decryptedByRecipients] =
        await auraChatContract.getMessages([0, 1, 2]);

      expect(senders.length).to.equal(3);
      expect(recipients.length).to.equal(3);

      for (let i = 0; i < 3; i++) {
        expect(senders[i]).to.equal(signers.alice.address);
        expect(recipients[i]).to.equal(signers.bob.address);
        expect(timestamps[i]).to.be.gt(0);
        expect(decryptedBySenders[i]).to.be.false;
        expect(decryptedByRecipients[i]).to.be.false;
      }
    });
  });
});
