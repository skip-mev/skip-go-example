import { SkipClient, RouteResponse } from "@skip-go/client";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import Head from "next/head";
import { createWalletClient, custom, Account } from "viem";
import { mainnet } from "viem/chains";
import { useEffect, useState } from "react";

export default function Home() {
  const [route, setRoute] = useState<RouteResponse | null>(null);

  const skipClient = new SkipClient({
    getCosmosSigner: async (chainID) => {
      const offlineSigner = await window.keplr?.getOfflineSigner(chainID);
      if (!offlineSigner)
        throw new Error("Keplr not installed or chain not added");
      return offlineSigner;
    },
    getEVMSigner: async () => {
      const ethereum = window.ethereum;
      if (!ethereum) throw new Error("MetaMask not installed");
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' }) as Account[];
      const account = accounts?.[0] 
      if (!account) throw new Error('No accounts found');
      const client = createWalletClient({
        account,
        chain: mainnet,
        transport: custom(window.ethereum),
      });
      return client;
    },
    getSVMSigner: async () => {
      const phantom = new PhantomWalletAdapter();
      await phantom.connect();
      return phantom;
    },
    apiURL: "/api/skip",
  });

  useEffect(() => {
    getChains();
    getAssets();
  });

  // Transfer 1 USDC from Noble to Osmosis
  const getCosmosRoute = async () => {
    try {
      setRoute(null);
      const result = await skipClient.route({
        amountIn: "1000000",
        sourceAssetDenom: "uusdc",
        sourceAssetChainID: "noble-1",
        destAssetDenom:
          "ibc/498A0751C798A0D9A389AA3691123DADA57DAA4FE165D5C75894505B876BA6E4",
        destAssetChainID: "osmosis-1",
        smartRelay: true,
      });
      setRoute(result);
    } catch (error) {
      console.error("Error getting Cosmos route:", error);
    }
  };

  // Transfer 1 USDC from Solana to Noble
  const getSolanaToCosmosRoute = async () => {
    try {
      setRoute(null);
      const result = await skipClient.route({
        sourceAssetDenom: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        sourceAssetChainID: "solana",
        destAssetDenom: "uusdc",
        destAssetChainID: "noble-1",
        amountIn: "1000000",
        smartRelay: true,
      });
      setRoute(result);
    } catch (error) {
      console.error("Error getting Solana to Cosmos route:", error);
    }
  };

  // Transfer 1 USDC from Ethereum to Noble
  const getEVMToCosmosRoute = async () => {
    try {
      setRoute(null);
      const result = await skipClient.route({
        sourceAssetDenom: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        sourceAssetChainID: "1",
        destAssetDenom: "uusdc",
        destAssetChainID: "noble-1",
        amountIn: "1000000",
        smartRelay: true,
      });
      setRoute(result);
    } catch (error) {
      console.error("Error getting Ethereum to Noble route:", error);
    }
  };

  const getAddress = async (chainID: string) => {
    // Ethereum mainnet
    if (chainID === "1") {
      const accounts = await window.ethereum.request({
        "method": "eth_requestAccounts"
       }) as string[]
       return {
        chainID,
        address: accounts?.[0]
      };
      // Solana mainnet
    } else if (chainID === "solana") {
      const phantom = new PhantomWalletAdapter();
      await phantom.connect();
      const publicKey = phantom.publicKey?.toBase58();
      if (!publicKey) throw new Error("Unable to get Solana address");
      return {
        chainID,
        address: publicKey,
      };
      // Cosmos chains
    } else {
      const key = await window.keplr?.getKey(chainID);
      if (!key) throw new Error(`No key for chainID: ${chainID}`);
      return {
        chainID,
        address: key.bech32Address,
      };
    }
  };

  // Function to execute the route
  const onExecuteRoute = async () => {
    try {
      if (!route) return;
      const userAddresses = await Promise.all(
        route.requiredChainAddresses.map((chainID: string) => getAddress(chainID))
      );
      await skipClient.executeRoute({
        route,
        userAddresses,
        onTransactionCompleted: async (chainID, txHash) => {
          console.log("Transaction completed", chainID, txHash);
        },
        onTransactionBroadcast: async ({ chainID, txHash }) => {
          console.log("Transaction broadcasted", chainID, txHash);
        },
        onTransactionTracked: async ({ chainID, txHash }) => {
          console.log("Transaction tracked", chainID, txHash);
        },
      });
      console.log("Route successfully executed");
    } catch (error) {
      console.error("Error executing route:", error);
    }
  };

  // Optional: Fetch chains and assets (if needed)
  const getChains = async () => {
    try {
      const chains = await skipClient.chains({
        includeEVM: true,
        includeSVM: true,
      });
      console.log("Chains:", chains);
    } catch (error) {
      console.error("Error fetching chains:", error);
    }
  };

  const getAssets = async () => {
    try {
      const assets = await skipClient.assets();
      console.log("Assets:", assets);
    } catch (error) {
      console.error("Error fetching assets:", error);
    }
  };

  return (
    <>
      <Head>
        <title>Simple Skip Go Example</title>
      </Head>
      <main>
        <p>Select a Route/Wallet Pair — Transfer 1 USDC</p>
        <button onClick={getCosmosRoute}>Noble to Osmosis via Keplr</button>
        <button onClick={getSolanaToCosmosRoute}>
          Solana to Noble via Phantom
        </button>
        <button onClick={getEVMToCosmosRoute}>
          Ethereum to Noble via Metamask
        </button>
        <div>
          <button onClick={onExecuteRoute} disabled={!route}>
            Execute Route
          </button>
        </div>
        {route && (
          <div>
            <p>Route details</p>
            <pre>{JSON.stringify(route, null, 2)}</pre>
          </div>
        )}
      </main>
    </>
  );
}
