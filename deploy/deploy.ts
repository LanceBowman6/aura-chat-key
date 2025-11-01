import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const networkName = hre.network.name;
  console.log(`Deploying to network: ${networkName}`);

  const deployedFHECounter = await deploy("FHECounter", {
    from: deployer,
    log: true,
  });

  console.log(`FHECounter contract: `, deployedFHECounter.address);

  const deployedEncryptedChat = await deploy("EncryptedChat", {
    // Explicitly select the EncryptedChat implementation with authentication
    contract: "contracts/EncryptedChatWithAuth.sol:EncryptedChat",
    from: deployer,
    log: true,
  });

  console.log(`EncryptedChat contract: `, deployedEncryptedChat.address);

  const deployedBidVault = await deploy("BidVault", {
    from: deployer,
    log: true,
  });
  console.log(`BidVault contract: `, deployedBidVault.address);
};
export default func;
func.id = "deploy_contracts"; // id required to prevent reexecution
func.tags = ["FHECounter", "EncryptedChat", "BidVault"];
