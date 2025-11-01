import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import type { FhevmInstance } from "@zama-fhe/relayer-sdk/bundle";
import { fhevmInitSDK, fhevmLoadSDK, createFhevmInstance } from "./internal/fhevm";
import { FhevmReactError } from "./internal/fhevm";

export type FhevmGoState = "idle" | "loading" | "ready" | "error";

export type UseFhevmProps = {
  provider?: ethers.BrowserProvider;
  chainId?: number;
};

export type UseFhevmReturn = {
  fhevmInstance: FhevmInstance | null;
  state: FhevmGoState;
  error: FhevmReactError | null;
};

export const useFhevm = ({ provider, chainId }: UseFhevmProps): UseFhevmReturn => {
  const [fhevmInstance, setFhevmInstance] = useState<FhevmInstance | null>(null);
  const [state, setState] = useState<FhevmGoState>("idle");
  const [error, setError] = useState<FhevmReactError | null>(null);
  const enableFhevm = (import.meta as any).env?.VITE_ENABLE_FHEVM === 'true';

  const createInstance = useCallback(async () => {
    if (!provider || !chainId) return;

    // Global kill-switch: disable FHEVM entirely unless explicitly enabled via env
    if (!enableFhevm) {
      setFhevmInstance(null);
      setState("ready");
      return;
    }

    try {
      setState("loading");
      setError(null);

      // Only initialize the SDK on supported testnets. For local/dev chains
      // we avoid hitting localhost relayer/KMS endpoints (7077, etc.).
      const isSepolia = chainId === 11155111;
      if (!isSepolia) {
        console.warn("Local/test chain detected. Skipping FHEVM SDK init.");
        setFhevmInstance(null);
        setState("ready");
        return;
      }

      await fhevmLoadSDK();
      // Use single-thread mode in dev to avoid SharedArrayBuffer requirement
      await fhevmInitSDK({ thread: 1 });

      const instance = await createFhevmInstance(provider, chainId);
      setFhevmInstance(instance);
      setState("ready");
    } catch (e) {
      const error = e instanceof FhevmReactError ? e : new FhevmReactError(String(e));
      setError(error);
      setState("error");
    }
  }, [provider, chainId, enableFhevm]);

  useEffect(() => {
    createInstance();
  }, [createInstance]);

  return {
    fhevmInstance,
    state,
    error,
  };
};
