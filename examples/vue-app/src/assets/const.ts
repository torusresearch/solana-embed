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
      rpcTarget: "https://green-dark-sky.solana-mainnet.quiknode.pro/0b4b99540b7930cf590dc7fb0a2d1c9a906fd53c", 
      ticker: "SOL",
      tickerName: "Solana Token",
    },
    [CHAINS.SOLANA_TESTNET]: {
      blockExplorerUrl: "?cluster=testnet",
      chainId: "0x2",
      displayName: "Solana Testnet",
      logo: "solana.svg",
      rpcTarget: "https://api.testnet.solana.com", 
      ticker: "SOL",
      tickerName: "Solana Token",
    },
    [CHAINS.SOLANA_DEVNET]: {
      blockExplorerUrl: "?cluster=devnet",
      chainId: "0x3",
      displayName: "Solana Devnet",
      logo: "solana.svg",
      rpcTarget: "https://api.devnet.solana.com", 
      ticker: "SOL",
      tickerName: "Solana Token",
    },
  } as const;