import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { Token, ASSOCIATED_TOKEN_PROGRAM_ID,TOKEN_PROGRAM_ID, MintInfo } from "@solana/spl-token";
import log from "loglevel";
import * as bors from "@project-serum/borsh";

// Layout
export const MintLayout = bors.struct([
    bors.u32("mintAuthorityOption"),
    bors.publicKey("mintAuthority"),
    bors.u64("supply"),
    bors.u8("decimals"),
    bors.u8("isInitialized"),
    bors.u32("freezeAuthorityOption"),
    bors.publicKey("freezeAuthority"),
  ]);

export const getSplInstructions = async ( connection: Connection, signerAddress:string,  receiver: string, amount: number, mintAddress: string): Promise<TransactionInstruction[]> => {
    const instruction : TransactionInstruction[] = []
    const transaction = new Transaction();
    const tokenMintAddress = mintAddress;
    const mintAccount = new PublicKey(tokenMintAddress);
    const signer = new PublicKey(signerAddress); // add gasless transactions
    const sourceTokenAccount = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, mintAccount, signer);
    const receiverAccount = new PublicKey(receiver);
    
    let associatedTokenAccount = receiverAccount;
    try {
      associatedTokenAccount = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        new PublicKey(tokenMintAddress),
        receiverAccount
      );
    } catch (e) {
      log.warn("error getting associatedTokenAccount, account passed is possibly a token account");
    }

    const [receiverAccountInfo, mintAccountInfo] = await connection.getMultipleAccountsInfo([associatedTokenAccount, mintAccount]);

    const mintAccountInfoDecoded :MintInfo = MintLayout.decode(mintAccountInfo?.data);


    if (receiverAccountInfo?.owner?.toString() !== TOKEN_PROGRAM_ID.toString()) {
      const newAccount = await Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        new PublicKey(tokenMintAddress),
        associatedTokenAccount,
        receiverAccount,
        signer
      );
    //   transaction.add(newAccount);
    instruction.push(newAccount);
    }
    const transferInstructions = Token.createTransferCheckedInstruction(
      TOKEN_PROGRAM_ID,
      sourceTokenAccount,
      mintAccount,
      associatedTokenAccount,
      signer,
      [],
      amount,
      mintAccountInfoDecoded.decimals || 0
    );
    instruction.push(transferInstructions);
    return instruction;
    // transaction.add(transferInstructions);
    // transaction.recentBlockhash = (await connection.getRecentBlockhash("finalized")).blockhash;
    // transaction.feePayer = signer 
    // return transaction;
  }
