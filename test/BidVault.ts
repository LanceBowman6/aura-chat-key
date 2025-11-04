import { expect } from "chai";
import { ethers } from "hardhat";

describe("BidVault", function () {
  it("allows commit then valid reveal", async function () {
    const [alice] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BidVault");
    const vault = await Factory.deploy();
    await vault.waitForDeployment();

    const amount = 42n;
    const salt = ethers.encodeBytes32String("pepper");
    const hash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["uint256","bytes32"],[amount, salt]));
    await expect(vault.connect(alice).commitBid(hash))
      .to.emit(vault, 'BidCommitted');

    await expect(vault.connect(alice).revealBid(amount, salt))
      .to.emit(vault, 'BidRevealed');

    const has = await vault.hasRevealed(alice.address);
    expect(has).to.eq(true);
  });

  it("supports cancelling an active commitment", async function () {
    const [alice] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BidVault");
    const vault = await Factory.deploy();
    await vault.waitForDeployment();

    const amount = 7n;
    const salt = ethers.encodeBytes32String("salt");
    const hash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["uint256","bytes32"],[amount, salt]));
    await vault.connect(alice).commitBid(hash);
    expect(await vault.isCommitted(alice.address)).to.eq(true);

    await expect(vault.connect(alice).cancelCommit())
      .to.emit(vault, 'BidCancelled');
    expect(await vault.isCommitted(alice.address)).to.eq(false);
  });
});
