import { ethers } from "ethers";
import type { FhevmInstance } from "@zama-fhe/relayer-sdk/bundle";
import type { FhevmInstanceConfig } from "@zama-fhe/relayer-sdk/web";
import type {
  FhevmInitSDKOptions,
  FhevmInitSDKType,
  FhevmLoadSDKType,
  FhevmWindowType,
} from "../fhevmTypes";
import { RelayerSDKLoader, isFhevmWindowType } from "./RelayerSDKLoader";

export class FhevmReactError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FhevmReactError";
  }
}

export const fhevmLoadSDK: FhevmLoadSDKType = async () => {
  const loader = new RelayerSDKLoader({
    trace: (message, ...optionalParams) => {
      console.log("[RelayerSDKLoader]", message, optionalParams);
    },
  });

  if (loader.isLoaded()) {
    return;
  }

  await loader.load();
};

export const fhevmInitSDK: FhevmInitSDKType = async (
  options?: FhevmInitSDKOptions
) => {
  if (typeof window === "undefined") {
    throw new FhevmReactError("fhevmInitSDK: can only be used in the browser.");
  }

  if (!isFhevmWindowType(window)) {
    throw new FhevmReactError("fhevmInitSDK: window.relayerSDK is not available.");
  }

  if (window.relayerSDK.__initialized__) {
    return true;
  }

  const success = await window.relayerSDK.initSDK(options);

  if (!success) {
    throw new FhevmReactError("fhevmInitSDK: Failed to initialize FHEVM SDK.");
  }

  return true;
};

export const getChainId = async (provider?: ethers.BrowserProvider) => {
  if (!provider) {
    throw new FhevmReactError("getChainId: provider is required.");
  }

  const network = await provider.getNetwork();
  return Number(network.chainId);
};

export const isWeb3Client = (provider: ethers.BrowserProvider) => {
  if (!provider) {
    return false;
  }

  return provider.provider && provider.provider.send !== undefined;
};

export const getFhevmRelayerMetadata = (chainId: number) => {
  switch (chainId) {
    case 11155111: // Sepolia
      return {
        relayerUrl: "https://dev-relayer.zama.ai/",
        kmsUrl: "https://dev-kms.zama.ai/",
      };
    default:
      throw new FhevmReactError(
        `getFhevmRelayerMetadata: Unsupported chainId: ${chainId}`
      );
  }
};

export const createFhevmInstance = async (
  provider: ethers.BrowserProvider,
  chainId: number,
  options?: FhevmInstanceConfig
): Promise<FhevmInstance> => {
  if (!isWeb3Client(provider)) {
    throw new FhevmReactError("createFhevmInstance: provider is not a Web3 client.");
  }

  const signer = await provider.getSigner();
  const address = await signer.getAddress();
  const relayerMetadata = getFhevmRelayerMetadata(chainId);

  const fhevmInstanceConfig: FhevmInstanceConfig = {
    ...options,
    relayerUrl: relayerMetadata.relayerUrl,
    kmsUrl: relayerMetadata.kmsUrl,
    signer,
    chainId,
  };

  if (!isFhevmWindowType(window)) {
    throw new FhevmReactError("createFhevmInstance: window.relayerSDK is not available.");
  }

  return window.relayerSDK.createInstance(fhevmInstanceConfig);
};
