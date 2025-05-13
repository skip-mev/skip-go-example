import {
  RouteResponse,
  assets,
  balances,
  chains,
  executeRoute,
  route as skipRoute,
  setClientOptions,
} from "@skip-go/client";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import Head from "next/head";
import { createWalletClient, custom, Account } from "viem";
import { mainnet } from "viem/chains";
import React, { useEffect, useState, useCallback } from "react";

export default function Home() {
  const [route, setRoute] = useState<RouteResponse | null>(null);

  const getCosmosSigner = async (chainID: string) => {
    const offlineSigner = await window.keplr?.getOfflineSigner(chainID);
    if (!offlineSigner) {
      throw new Error("Keplr not installed or chain not added");
    }
    return offlineSigner;
  };

  const getEvmSigner = async (chainId: string) => {
    const ethereum = window.ethereum;
    if (!ethereum) {
      throw new Error("MetaMask not installed");
    }
    const accounts = (await ethereum.request({
      method: 'eth_requestAccounts',
    })) as Account[];
    const account = accounts?.[0];
    if (!account) {
      throw new Error("No accounts found");
    }
    const client = createWalletClient({
      account,
      chain: mainnet,
      transport: custom(window.ethereum),
    });
    return client;
  };

  const getSvmSigner = async () => {
    const phantom = new PhantomWalletAdapter();
    await phantom.connect();
    if (!phantom.publicKey) {
      throw new Error("Phantom wallet not connected or public key unavailable");
    }
    return phantom;
  };

  // Consolidate setClientOptions logic
  const initializeClient = useCallback(() => {
    // Construct the absolute URL for the proxy dynamically
    const dynamicApiUrl = `${window.location.origin}/api/skip`;

    setClientOptions({
      apiUrl: dynamicApiUrl, 
      // apiKey: "YOUR_API_KEY", 
      // endpointOptions: { /* ... */ }, 
      // cacheDurationMs: 300000, 
    });
  }, []);

  const getCosmosRoute = async () => {
    try {
      setRoute(null);
      const result = await skipRoute({
        amountIn: "1000000",
        sourceAssetDenom: "uusdc",
        sourceAssetChainId: "noble-1",
        destAssetDenom:
          "ibc/498A0751C798A0D9A389AA3691123DADA57DAA4FE165D5C75894505B876BA6E4",
        destAssetChainId: "osmosis-1",
        smartRelay: true,
      });
      setRoute(result ?? null); // Handle undefined result
    } catch (error) {
      console.error("Error getting Cosmos route:", error);
    }
  };

  const getSolanaToCosmosRoute = async () => {
    try {
      setRoute(null);
      const result = await skipRoute({
        sourceAssetDenom: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        sourceAssetChainId: "solana",
        destAssetDenom: "uusdc",
        destAssetChainId: "noble-1",
        amountIn: "1000000",
        smartRelay: true,
      });
      setRoute(result ?? null); // Handle undefined result
    } catch (error) {
      console.error("Error getting Solana to Cosmos route:", error);
    }
  };

  const getEVMToCosmosRoute = async () => {
    try {
      setRoute(null);
      const result = await skipRoute({
        sourceAssetDenom: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        sourceAssetChainId: "1",
        destAssetDenom: "uusdc",
        destAssetChainId: "noble-1",
        amountIn: "1000000",
        smartRelay: true,
      });
      setRoute(result ?? null); // Handle undefined result
    } catch (error) {
      console.error("Error getting Ethereum to Noble route:", error);
    }
  };

  const getAddress = useCallback(async (chainIDParam: string) => {
    if (chainIDParam === "1") {
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[];
      return {
        chainId: chainIDParam,
        address: accounts?.[0],
      };
    } else if (chainIDParam === "solana") {
      const phantom = new PhantomWalletAdapter();
      await phantom.connect();
      const publicKey = phantom.publicKey?.toBase58();
      if (!publicKey) throw new Error("Unable to get Solana address");
      return {
        chainId: chainIDParam,
        address: publicKey,
      };
    } else {
      const key = await window.keplr?.getKey(chainIDParam);
      if (!key) throw new Error(`No key for chainID: ${chainIDParam}`);
      return {
        chainId: chainIDParam,
        address: key.bech32Address,
      };
    }
  }, []);

  const getChains = useCallback(async () => {
    try {
      const chainsData = await chains({
        includeEvm: true,
        includeSvm: true,
      });
      console.log("Chains:", chainsData);
    } catch (error) {
      console.error("Error fetching chains:", error);
    }
  }, []);

  const getAssets = useCallback(async () => {
    try {
      const assetsData = await assets({});
      console.log("Assets:", assetsData);
    } catch (error) {
      console.error("Error fetching assets:", error);
    }
  }, []);

  const getBalances = useCallback(async () => {
    try {
      const [nobleAddressInfo, osmosisAddressInfo] = await Promise.all([
        getAddress("noble-1"),
        getAddress("osmosis-1"),
      ]);

      const balancesData = await balances({
        chains: {
          [nobleAddressInfo.chainId]: {
            address: nobleAddressInfo.address,
          },
          [osmosisAddressInfo.chainId]: {
            address: osmosisAddressInfo.address,
          },
        },
      });
      console.log("Balances:", balancesData);
    } catch (error) {
      console.error("Error fetching balances:", error);
    }
  }, [getAddress]);

  useEffect(() => {
    initializeClient();

    // Initial data fetching
    // These functions are now memoized with useCallback, so they are stable dependencies.
    getChains();
    getAssets();
    getBalances();
  }, [initializeClient, getChains, getAssets, getBalances]);

  const onExecuteRoute = async () => {
    try {
      if (!route) return;
      const userAddresses = await Promise.all(
        route.requiredChainAddresses.map((currentChainID: string) => getAddress(currentChainID))
      );
      
      await executeRoute({
        route,
        userAddresses,
        getCosmosSigner,
        getEvmSigner: getEvmSigner as any,
        getSvmSigner: getSvmSigner as any,
        onTransactionCompleted: async (txInfo: { chainId: string; txHash: string; status?: any; response?: any }) => {
          console.log("Transaction completed", txInfo.chainId, txInfo.txHash, txInfo.status, txInfo.response);
        },
        onTransactionBroadcast: async ({ chainId: broadcastChainId, txHash, response }: { chainId: string; txHash: string; response?:any }) => {
          console.log("Transaction broadcasted", broadcastChainId, txHash, response);
        },
        onTransactionTracked: async ({ chainId: trackedChainId, txHash, status }: { chainId: string; txHash: string; status?: any }) => {
          console.log("Transaction tracked", trackedChainId, txHash, status);
        },
      });
      console.log("Route successfully executed");
    } catch (error) {
      console.error("Error executing route:", error);
    }
  };

  return (
    <>
      <Head>
        <title>Simple Skip Go Example</title>
      </Head>
      <main >
        <p>Select a Route/Wallet Pair — Transfer 1 USDC  </p>
        <em>Warning: This is a test transaction. No destination address has been set so your funds will be sent into the void.</em>
        <div>
          <button onClick={getCosmosRoute}>Noble to Osmosis via Keplr</button>
          <button onClick={getSolanaToCosmosRoute}>
            Solana to Noble via Phantom
          </button>
          <button onClick={getEVMToCosmosRoute}>
            Ethereum to Noble via Metamask
          </button>
        </div>
        <button onClick={onExecuteRoute} disabled={!route}>
          Execute Route
        </button>
      </main>
      {route && (
        <div>
          <pre>{JSON.stringify(route, null, 2)}</pre>
        </div>
      )}
    </>
  );
}
