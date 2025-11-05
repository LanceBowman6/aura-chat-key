import { task } from "hardhat/config";

task("accounts", "Prints the list of accounts")
  .addFlag("withBalances", "Also print balances in ETH")
  .setAction(async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();
    const provider = hre.ethers.provider;
    for (const account of accounts) {
      if (taskArgs.withBalances) {
        const bal = await provider.getBalance(account.address);
        console.log(`${account.address} \t ${hre.ethers.formatEther(bal)} ETH`);
      } else {
        console.log(`${account.address}`);
      }
    }
  });
