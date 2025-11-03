import { task } from "hardhat/config";
import { keccak256, toUtf8Bytes } from "ethers";

task("bid:hash", "Compute bid hash keccak256(amount,salt)")
  .addParam("amount", "Bid amount as uint256 string")
  .addParam("salt", "Salt as string")
  .setAction(async (args, hre) => {
    const amt = BigInt(args.amount);
    // bytes32 salt from string
    const saltBytes = hre.ethers.AbiCoder.defaultAbiCoder().encode(["bytes32"], [keccak256(toUtf8Bytes(args.salt))]);
    const hash = hre.ethers.solidityPackedKeccak256(["uint256","bytes32"],[amt, saltBytes]);
    console.log(hash);
  });

task("bid:inspect", "Inspect a bidder's commitment and reveal status")
  .addOptionalParam("address", "Bidder address; defaults to first signer")
  .setAction(async (args, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const who = args.address ?? signer.address;
    const vault = await hre.ethers.getContract("BidVault");
    const [hash, revealed] = await vault.commitOf(who);
    console.log(`hash=${hash} revealed=${revealed}`);
  });
