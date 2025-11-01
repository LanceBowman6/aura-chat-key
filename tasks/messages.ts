import { task } from "hardhat/config";

task("messages:count", "Get message count for an address")
  .addOptionalParam("user", "Address to query, defaults to first signer")
  .setAction(async (args, hre) => {
    const [signer] = await hre.ethers.getSigners();
    const user = args.user ?? signer.address;

    const chat = await hre.ethers.getContract("EncryptedChat");
    const count = await chat.getMessageCountFor(user);
    console.log(`Message count for ${user}:`, count.toString());
  });

