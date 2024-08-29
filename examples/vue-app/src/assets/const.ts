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
      rpcTarget: "https://omniscient-fabled-pool.solana-mainnet.quiknode.pro/c07218c84ba51cac60d68e60364f24225bd5e972", 
      ticker: "SOL",
      tickerName: "Solana Token",
    },
    [CHAINS.SOLANA_TESTNET]: {
      blockExplorerUrl: "?cluster=testnet",
      chainId: "0x2",
      displayName: "Solana Testnet",
      logo: "solana.svg",
      rpcTarget: "https://ultra-damp-bird.solana-testnet.quiknode.pro/b1240036081a1d63254c1ca44b5554e77fc0e880/", 
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