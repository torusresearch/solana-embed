import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

export async function generateSPLInstruction({
  connection,
  sender,
  receiver,
  mint,
  amount,
}: {
  connection: Connection | null;
  sender: string;
  receiver: string;
  mint: string;
  amount: number;
}) {
  if (!connection) throw new Error("Connection not found");
  const mintAccount = new PublicKey(mint);
  const senderAccount = new PublicKey(sender);
  const receiverAccount = new PublicKey(receiver);

  const source = await getAssociatedTokenAddress(mintAccount, senderAccount);
  const destination = await getAssociatedTokenAddress(mintAccount, receiverAccount);

  const instructions: TransactionInstruction[] = [];
  try {
    await getAccount(connection, destination);
  } catch {
    // create a new instruction if token account doesn't exist
    const newAccountInstruction = createAssociatedTokenAccountInstruction(senderAccount, destination, receiverAccount, mintAccount);
    instructions.push(newAccountInstruction);
  }
  const transferInstruction = createTransferInstruction(source, destination, senderAccount, amount);
  instructions.push(transferInstruction);
  return instructions;
}

export async function generateSolTransferInstruction(sender: string, receiver: string, amount: number) {
  return SystemProgram.transfer({
    fromPubkey: new PublicKey(sender),
    toPubkey: new PublicKey(receiver),
    lamports: amount * LAMPORTS_PER_SOL,
  });
}

export async function generateLegacyTransaction(connection: Connection | null, sender: string, instructions: TransactionInstruction[]) {
  if (!connection) throw new Error("Connection not found");
  const latestBlockhash = await connection.getLatestBlockhash("finalized");
  const transaction = new Transaction({
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    feePayer: new PublicKey(sender),
  }).add(...instructions);
  return transaction;
}

export async function generateVersionedTransaction(connection: Connection | null, sender: string, instructions: TransactionInstruction[]) {
  if (!connection) throw new Error("Connection not found");
  const latestBlockhash = await connection.getLatestBlockhash("finalized");
  // create v0 compatible message
  const messageV0 = new TransactionMessage({
    payerKey: new PublicKey(sender),
    instructions,
    recentBlockhash: latestBlockhash.blockhash,
  }).compileToV0Message();
  const transactionV0 = new VersionedTransaction(messageV0);
  return transactionV0;
}
