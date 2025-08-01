<script lang="ts" setup>
import { Connection, PublicKey } from "@solana/web3.js";
import { CHAIN_NAMESPACES, PROVIDER_JRPC_METHODS, ProviderConfig } from "@toruslabs/base-controllers";
import { bs58 } from "@toruslabs/bs58";
import nacl from "@toruslabs/tweetnacl-js";
import WsEmbed, { SOLANA_CHAIN_IDS as CHAIN_IDS, SOLANA_METHOD_TYPES as SOL_METHOD_TYPES } from "@web3auth/ws-embed";
import { computed } from "vue";

import {
  generateLegacyTransaction,
  generateSolTransferInstruction,
  generateSPLInstruction,
  generateVersionedTransaction,
} from "../utils/solanaHelper";

import Button from "./Button";

const props = defineProps<{
  wsEmbed?: WsEmbed;
  account: string;
  preferredChainConfig: ProviderConfig | null;
  chainId: string;
}>();

const connection = computed(() => {
  return props.preferredChainConfig ? new Connection(props.preferredChainConfig?.rpcTarget) : null;
});

const uiConsole = (...args: unknown[]): void => {
  const el = document.querySelector("#console>pre");
  const h1 = document.querySelector("#console>h1");
  const consoleBtn = document.querySelector<HTMLElement>("#console>div.clear-console-btn");
  if (h1) {
    h1.innerHTML = args[0] as string;
  }
  if (el) {
    el.innerHTML = JSON.stringify(args[1] || {}, null, 2);
  }
  if (consoleBtn) {
    consoleBtn.style.display = "block";
  }
};

const chainToSwitchTo = computed(() => (props.chainId === CHAIN_IDS.SOLANA_TESTNET ? CHAIN_IDS.SOLANA_DEVNET : CHAIN_IDS.SOLANA_TESTNET));
const chainNameToSwitchTo = computed(() => (props.chainId === CHAIN_IDS.SOLANA_TESTNET ? "Solana Devnet" : "Solana Testnet"));
const switchChain = async () => {
  const result = await props.wsEmbed?.provider.request({
    method: PROVIDER_JRPC_METHODS.WALLET_SWITCH_CHAIN,
    params: { chainId: CHAIN_NAMESPACES.SOLANA + ":" + Number(chainToSwitchTo.value) },
  });
  uiConsole("Switch Chain", result);
};

const getBalance = async () => {
  const result = await props.wsEmbed?.provider.request({
    method: "getBalance",
    params: [props.account],
  });
  const balance = ((result as { value: number })?.value || 0) / 1e9;
  uiConsole("Balance", { balance });
};

const getPublicKey = async () => {
  const result = await props.wsEmbed?.provider.request({
    method: SOL_METHOD_TYPES.SOLANA_PUBLIC_KEY,
    params: [],
  });
  uiConsole("Success", { result });
};

// Signing
const signMessage = async () => {
  uiConsole("Signing Message");
  try {
    const msg = Buffer.from("Test Signing Message ", "utf8");
    const signature = (await props.wsEmbed?.provider.request({
      method: SOL_METHOD_TYPES.SIGN_MESSAGE,
      params: { data: msg.toString(), from: props.account },
    })) as string;
    nacl.sign.detached.verify(msg, bs58.decode(signature), new PublicKey(props.account).toBytes());
    uiConsole("Success", { signature });
  } catch (e) {
    uiConsole("Error signing message", (e as Error).message);
  }
};

const signVersionedTransaction = async () => {
  uiConsole("Signing Versioned Transaction");
  try {
    const instruction = await generateSolTransferInstruction(props.account, props.account, 0.01);
    const transaction = await generateVersionedTransaction(connection.value, props.account, [instruction]);
    const signature = (await props.wsEmbed?.provider.request({
      method: SOL_METHOD_TYPES.SIGN_TRANSACTION,
      params: { message: Buffer.from(transaction.serialize()).toString("base64") },
    })) as string;
    uiConsole("Success", { signature });
  } catch (e) {
    console.log(e);
    uiConsole("Error", (e as Error).message);
  }
};

const signLegacyTransaction = async () => {
  uiConsole("Signing Legacy Transaction");
  try {
    const instruction = await generateSolTransferInstruction(props.account, props.account, 0.01);
    const transaction = await generateLegacyTransaction(connection.value, props.account, [instruction]);
    const signature = (await props.wsEmbed?.provider.request({
      method: SOL_METHOD_TYPES.SIGN_TRANSACTION,
      params: { message: Buffer.from(transaction.serialize({ requireAllSignatures: false })).toString("base64") },
    })) as string;
    uiConsole("Success", { signature });
  } catch (e) {
    uiConsole("Error", (e as Error).message);
  }
};

const signMultipleInstructionTransaction = async () => {
  uiConsole("Sending Multiple Instruction Transaction");
  try {
    const solTransferInstruction = await generateSolTransferInstruction(props.account, props.account, 0.01);
    const transaction = await generateVersionedTransaction(connection.value, props.account, [solTransferInstruction, solTransferInstruction]);

    const signature = (await props.wsEmbed?.provider.request({
      method: SOL_METHOD_TYPES.SIGN_TRANSACTION,
      params: { message: Buffer.from(transaction.serialize()).toString("base64") },
    })) as string;
    uiConsole("Success", { signature });
  } catch (e) {
    uiConsole("Error", (e as Error).message);
  }
};

const signAllTransactions = async () => {
  uiConsole("Signing Versioned Transaction");
  try {
    const newTransaction = async () => {
      const instruction = await generateSolTransferInstruction(props.account, props.account, 0.01);
      const transaction = await generateVersionedTransaction(connection.value, props.account, [instruction]);
      return Buffer.from(transaction.serialize()).toString("base64");
    };
    const transactions = await Promise.all([newTransaction(), newTransaction()]);
    const result = await props.wsEmbed?.provider.request({
      method: SOL_METHOD_TYPES.SIGN_ALL_TRANSACTIONS,
      params: { message: transactions },
    });
    uiConsole("Success", { transactions: result });
  } catch (e) {
    uiConsole("Error", (e as Error).message);
  }
};

// Send Transaction
const sendVersionedTransaction = async () => {
  uiConsole("Sending Versioned Transaction");
  try {
    const instruction = await generateSolTransferInstruction(props.account, props.account, 0.01);
    const transaction = await generateVersionedTransaction(connection.value, props.account, [instruction]);
    const signature = (await props.wsEmbed?.provider.request({
      method: SOL_METHOD_TYPES.SEND_TRANSACTION,
      params: { message: Buffer.from(transaction.serialize()).toString("base64") },
    })) as string;
    uiConsole("Success", { signature });
  } catch (e) {
    uiConsole("Error", (e as Error).message);
  }
};

const sendLegacyTransaction = async () => {
  uiConsole("Sending Legacy Transaction");
  try {
    const instruction = await generateSolTransferInstruction(props.account, props.account, 0.01);
    const transaction = await generateLegacyTransaction(connection.value, props.account, [instruction]);
    const signature = (await props.wsEmbed?.provider.request({
      method: SOL_METHOD_TYPES.SEND_TRANSACTION,
      params: { message: Buffer.from(transaction.serialize({ requireAllSignatures: false })).toString("base64") },
    })) as string;
    uiConsole("Success", { signature });
  } catch (e) {
    uiConsole("Error", (e as Error).message);
  }
};

const sendSPLTransaction = async () => {
  uiConsole("Sending SPL Transaction");
  try {
    const instructions = await generateSPLInstruction({
      connection: connection.value,
      sender: props.account,
      receiver: "24yYBY7fBjkY8Sfe8WpZcPNdcvRDDubVc6Y4AE7yEWpE",
      mint: "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr",
      amount: 1e6,
    });
    const transaction = await generateVersionedTransaction(connection.value, props.account, instructions);
    const signature = (await props.wsEmbed?.provider.request({
      method: SOL_METHOD_TYPES.SEND_TRANSACTION,
      params: { message: Buffer.from(transaction.serialize()).toString("base64") },
    })) as string;
    uiConsole("Success", { signature });
  } catch (e) {
    uiConsole("Error", (e as Error).message);
  }
};

const sendMultipleInstructionTransaction = async () => {
  uiConsole("Sending Multiple Instruction Transaction");
  try {
    const solTransferInstruction = await generateSolTransferInstruction(props.account, props.account, 0.01);
    const transaction = await generateVersionedTransaction(connection.value, props.account, [solTransferInstruction, solTransferInstruction]);

    const signature = (await props.wsEmbed?.provider.request({
      method: SOL_METHOD_TYPES.SEND_TRANSACTION,
      params: { message: Buffer.from(transaction.serialize()).toString("base64") },
    })) as string;
    uiConsole("Success", { signature });
  } catch (e) {
    uiConsole("Error", (e as Error).message);
  }
};
</script>

<template>
  <div>
    <div class="flex-row">
      <Button @on-click="getBalance">Get Balance</Button>
      <Button @on-click="getPublicKey">Get Public Key</Button>
    </div>
    <div class="divider" />

    <p class="btn-label">Switch Chain</p>
    <div class="flex-row">
      <Button @on-click="switchChain">Switch Chain To {{ chainNameToSwitchTo }}</Button>
    </div>
    <div class="divider" />

    <p class="btn-label">Signing</p>
    <div class="flex-row">
      <Button @on-click="signMessage">Sign Message</Button>
    </div>
    <div class="flex-row">
      <Button @on-click="signVersionedTransaction">Sign Versioned Transaction</Button>
      <Button @on-click="signLegacyTransaction">Sign Legacy Transaction</Button>
    </div>
    <div class="flex-row">
      <Button @on-click="signMultipleInstructionTransaction">Sign Multiple Instruction Transaction</Button>
      <Button @on-click="signAllTransactions">Sign All Transactions</Button>
    </div>
    <div class="divider" />

    <p class="btn-label">Transaction</p>
    <div class="flex-row">
      <Button @on-click="sendVersionedTransaction">Send Versioned Transaction</Button>
      <Button @on-click="sendLegacyTransaction">Send Legacy Transaction</Button>
    </div>
    <div class="flex-row">
      <Button @on-click="sendMultipleInstructionTransaction">Send Multiple Instruction Transaction</Button>
    </div>
    <div>
      <span class="btn-sublabel">(Get USDC-Dev token <a href="https://spl-token-faucet.com/?token-name=USDC" target="_blank">here</a>)</span>
    </div>
    <div class="flex-row">
      <Button @on-click="sendSPLTransaction">Send SPL Token</Button>
    </div>
  </div>
</template>

<style scoped>
@import "Dashboard.css";
</style>
