import { clusterApiUrl } from "@solana/web3.js";

export const CHAINS = {
    SOLANA_MAINNET: "mainnet",
    SOLANA_TESTNET: "testnet",
    SOLANA_DEVNET: "devnet",
  } as const;
  

export const SUPPORTED_NETWORKS = {
    [CHAINS.SOLANA_MAINNET]: {
      blockExplorerUrl: "?cluster=mainnet",
      chainId: "0x1",
      displayName: "Solana Mainnet",
      logo: "solana.svg",
      // rpcTarget: "https://api.devnet.solana.com",
      rpcTarget: clusterApiUrl("mainnet-beta"),
      ticker: "SOL",
      tickerName: "Solana Token",
    },
    [CHAINS.SOLANA_TESTNET]: {
      blockExplorerUrl: "?cluster=testnet",
      chainId: "0x2",
      displayName: "Solana Testnet",
      logo: "solana.svg",
      rpcTarget: clusterApiUrl("testnet"),
      ticker: "SOL",
      tickerName: "Solana Token",
    },
    [CHAINS.SOLANA_DEVNET]: {
      blockExplorerUrl: "?cluster=devnet",
      chainId: "0x3",
      displayName: "Solana Devnet",
      logo: "solana.svg",
      rpcTarget: clusterApiUrl("devnet"),
      ticker: "SOL",
      tickerName: "Solana Token",
    },
  } as const;