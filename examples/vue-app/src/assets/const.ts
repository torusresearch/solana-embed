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
      rpcTarget: "https://green-dark-sky.solana-mainnet.quiknode.pro/97c87069b81ef4ec0765a267525c82153e5404fc", 
      ticker: "SOL",
      tickerName: "Solana Token",
    },
    [CHAINS.SOLANA_TESTNET]: {
      blockExplorerUrl: "?cluster=testnet",
      chainId: "0x2",
      displayName: "Solana Testnet",
      logo: "solana.svg",
      rpcTarget: "https://spring-black-waterfall.solana-testnet.quiknode.pro/89830c37acd15df105b23742d37f33dc85b5eff8/", 
      ticker: "SOL",
      tickerName: "Solana Token",
    },
    [CHAINS.SOLANA_DEVNET]: {
      blockExplorerUrl: "?cluster=devnet",
      chainId: "0x3",
      displayName: "Solana Devnet",
      logo: "solana.svg",
      rpcTarget: "https://api.google.devnet.solana.com", 
      ticker: "SOL",
      tickerName: "Solana Token",
    },
  } as const;