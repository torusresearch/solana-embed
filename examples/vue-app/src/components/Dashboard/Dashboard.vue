<script lang="ts" setup>
import { onMounted, ref, watch } from "vue";
import {
  clusterApiUrl,
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Secp256k1Program,
  Transaction,
  StakeProgram,
  Keypair,
  Authorized,
  Lockup,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  Signer,
  AddressLookupTableProgram,
  Version,
  AddressLookupTableAccount,
  VersionedMessage,
} from "@solana/web3.js";
import Torus, { TORUS_BUILD_ENV_TYPE } from "@toruslabs/solana-embed";
import { SUPPORTED_NETWORKS, CHAINS } from "../../assets/const";
import nacl from "tweetnacl";
import log from "loglevel";
import { getSplInstructions, whiteLabelData } from "../helper";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { createDeposit, createRedeemSolInstruction, createRedeemInstruction, redeemSol, redeemSplToken } from "@cwlee/solana-lookup-sdk";
import { ec as EC } from "elliptic";
import { createHash } from "crypto";
import copyToClipboard from "copy-to-clipboard";

const ec = new EC("secp256k1");
const secp = ec.genKeyPair({ entropy: "maximumentroyneededfortesting" });
let torus: Torus | null;
let conn: Connection;
let publicKeys: string[] | undefined;
let isWhiteLabeEnabled = false;
const isCopied = ref(false);

const privateKey = ref();
const network = ref("");
const isTopupHidden = ref(false);
const pubkey = ref("");
const buildEnv = ref<TORUS_BUILD_ENV_TYPE>("development");
const showButton = ref(false);
const copied = ref(false);
const consoleDiv = ref<HTMLDivElement>();

const testnet = SUPPORTED_NETWORKS["testnet"].displayName;

watch(buildEnv, (buildEnv, prevBuildEnv) => {
  if (buildEnv !== prevBuildEnv) {
    if (torus) {
      torus.cleanUp();
      torus = null;
    }
  }
});

const login = async (isWhiteLabel = false) => {
  try {
    if (!torus || isWhiteLabel !== isWhiteLabeEnabled) {
      torus = new Torus();
    }

    if (!torus.isInitialized || isWhiteLabel !== isWhiteLabeEnabled) {
      isWhiteLabeEnabled = isWhiteLabel;
      isWhiteLabeEnabled
        ? await torus.init({
            buildEnv: buildEnv.value,
            whiteLabel: whiteLabelData,
          })
        : await torus.init({
            buildEnv: buildEnv.value,
            // network: "mainnet-beta"
          });
      // await torus.init({
      //   buildEnv: buildEnv.value,
      //   showTorusButton: showButton.value,
      //   network: {
      //     blockExplorerUrl: "?cluster=testnet",
      //     chainId: "0x2",
      //     displayName: "Solana Testnet",
      //     logo: "solana.svg",
      //     rpcTarget: clusterApiUrl("testnet"),
      //     ticker: "SOL",
      //     tickerName: "Solana Token",
      //   },
      // });
    }
    console.log(torus);
    publicKeys = await torus?.login({});
    isTopupHidden.value = torus?.isTopupHidden;
    pubkey.value = publicKeys ? publicKeys[0] : "";
    const target_network = (await torus.provider.request({
      method: "solana_provider_config",
      params: [],
    })) as { rpcTarget: string; displayName: string };
    console.log(target_network);
    network.value = target_network.displayName;
    conn = new Connection(target_network?.rpcTarget, "max");
  } catch (err) {
    console.error(err);
  }
};

const loginWithPrivateKey = async () => {
  try {
    if (!torus) {
      torus = new Torus();
    }
    if (!torus.isInitialized) {
      await torus.init({
        buildEnv: buildEnv.value,
        // network: "mainnet-beta"
      });
    }
    console.log(torus);
    await torus.loginWithPrivateKey({
      privateKey: privateKey.value || secp.getPrivate("hex"),
      userInfo: {
        email: "test@test.com",
        name: "test",
        profileImage: "",
        verifier: "google",
        verifierId: "google-test",
      },
    });
    publicKeys = await torus.getAccounts();
    log.info(publicKeys);
    pubkey.value = publicKeys ? publicKeys[0] : "";
    const target_network = (await torus.provider.request({
      method: "solana_provider_config",
      params: [],
    })) as { rpcTarget: string; displayName: string };
    console.log(target_network);
    network.value = target_network.displayName;
    conn = new Connection(target_network?.rpcTarget, "max");
  } catch (err) {
    console.error(err);
  }
};

const logout = async () => {
  torus?.logout();
  pubkey.value = "";
};

const transfer = async () => {
  const block = await conn.getLatestBlockhash("finalized");
  const TransactionInstruction = SystemProgram.transfer({
    fromPubkey: new PublicKey(publicKeys![0]),
    toPubkey: new PublicKey(publicKeys![0]),
    lamports: 0.01 * LAMPORTS_PER_SOL,
  });
  const latestBlockhash = await conn.getLatestBlockhash();

  const messageV0 = new TransactionMessage({
    payerKey: new PublicKey(publicKeys![0]),
    instructions: [TransactionInstruction],
    recentBlockhash: latestBlockhash.blockhash,
  }).compileToV0Message();
  const transactionV0 = new VersionedTransaction(messageV0);

  try {
    const res = await torus?.sendTransaction(transactionV0);
    debugConsole(res as string);
  } catch (e) {
    log.error(e);
    debugConsole(e as string);
  }
};

const transferLegacy = async (isOldImplementation = false) => {
  const block = await conn.getLatestBlockhash("finalized");
  const TransactionInstruction = SystemProgram.transfer({
    fromPubkey: new PublicKey(publicKeys![0]),
    toPubkey: new PublicKey(publicKeys![0]),
    lamports: 0.01 * LAMPORTS_PER_SOL,
  });
  let transaction = new Transaction({
    blockhash: block.blockhash,
    lastValidBlockHeight: block.lastValidBlockHeight,
    feePayer: new PublicKey(publicKeys![0]),
  }).add(TransactionInstruction);
  try {
    const res = await torus?.sendTransaction(transaction);
    debugConsole(res as string);
  } catch (e) {
    log.error(e);
    debugConsole(e as string);
  }
};

const transferSPL = async () => {
  const block = await conn.getLatestBlockhash("finalized");

  // usdc mint account on mainnet
  const destinationTokenAccount = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    new PublicKey("GLV6NbHHV31CMQX2zn67V5Bihfcsdi1V5uGhmyLNASK9")
  ); // Phantom account for testing, it already has an associated account
  const fromTokenAccount = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    new PublicKey("Fu4CutxCWcQmA1gvcJyAZX88GPgbKpA1zegFr1LiUUb")
  ); // Phantom account for testing, it already has an associated account

  const transferInstructions = Token.createTransferCheckedInstruction(
    TOKEN_PROGRAM_ID,
    fromTokenAccount,
    new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    destinationTokenAccount,
    new PublicKey(publicKeys![0]),
    [],
    1000000,
    6
  );

  // fida mint account on mainet
  const sourceTokenAccount = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    new PublicKey("EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp"),
    new PublicKey(publicKeys![0])
  );

  const destinationTokenAccount2 = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    new PublicKey("EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp"),
    new PublicKey("D2LtZtYTj6Aep84DGmFiUiNCgcz2J8HvhV4qortTx3mM")
  );

  const transferInstructions2 = Token.createTransferCheckedInstruction(
    TOKEN_PROGRAM_ID,
    sourceTokenAccount,
    new PublicKey("EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp"),
    destinationTokenAccount2,
    new PublicKey(publicKeys![0]),
    [],
    100000,
    6
  );
  const latestBlockhash = await conn.getLatestBlockhash();
  // create v0 compatible message
  const messageV0 = new TransactionMessage({
    payerKey: new PublicKey(publicKeys![0]),
    instructions: [transferInstructions],
    recentBlockhash: latestBlockhash.blockhash,
  }).compileToV0Message();
  const transactionV0 = new VersionedTransaction(messageV0);

  try {
    const res = await torus?.sendTransaction(transactionV0);
    debugConsole(res as string);
  } catch (e) {
    log.error(e);
    debugConsole(e as string);
  }
};

const sendMultipleInstructionTransaction = async () => {
  const block = await conn.getLatestBlockhash("finalized");

  const pubkey = new Uint8Array([
    81, 176, 126, 129, 139, 165, 11, 146, 225, 138, 101, 191, 188, 243, 174, 70, 93, 52, 206, 152, 74, 55, 152, 76, 232, 40, 61, 17, 126, 237, 151,
    71, 96, 58, 71, 182, 68, 5, 211, 15, 221, 192, 126, 159, 98, 194, 44, 50, 10, 114, 47, 130, 1, 176, 42, 196, 90, 16, 245, 93, 126, 52, 170, 32,
  ]);

  const fromPubkey = Keypair.generate().publicKey;
  const newAccountPubkey = Keypair.generate().publicKey;
  const authorizedPubkey = Keypair.generate().publicKey;
  const authorized = new Authorized(authorizedPubkey, authorizedPubkey);
  const lockup = new Lockup(0, 0, fromPubkey);
  const rapports = 123;
  const transactionStaking = StakeProgram.createAccount({
    fromPubkey,
    stakePubkey: newAccountPubkey,
    authorized,
    lockup,
    lamports: rapports,
  });
  const [systemInstruction, stakeInstruction] = transactionStaking.instructions;

  const TransactionInstruction2 = SystemProgram.transfer({
    fromPubkey: new PublicKey(publicKeys![0]),
    toPubkey: new PublicKey(publicKeys![0]),
    lamports: 0.01 * LAMPORTS_PER_SOL,
  });
  let instructions = [TransactionInstruction2, TransactionInstruction2];

  const latestBlockhash = await conn.getLatestBlockhash();
  // create v0 compatible message
  const messageV0 = new TransactionMessage({
    payerKey: fromPubkey,
    instructions,
    recentBlockhash: latestBlockhash.blockhash,
  }).compileToV0Message();
  const transactionV0 = new VersionedTransaction(messageV0);

  try {
    const res = await torus?.sendTransaction(transactionV0);
    debugConsole(res as string);
  } catch (e) {
    log.error(e);
    debugConsole(e as string);
  }
};

// const gaslessTransfer = async () => {
//   const block = await conn.getLatestBlockhash("finalized");
//   const TransactionInstruction = SystemProgram.transfer({
//     fromPubkey: new PublicKey(publicKeys![0]),
//     toPubkey: new PublicKey(publicKeys![0]),
//     lamports: 0.01 * LAMPORTS_PER_SOL,
//   });
//   try {
//     const res = await torus?.getGaslessPublicKey();
//     let transaction = new Transaction({
//       blockhash: block.blockhash,
//       lastValidBlockHeight: block.lastValidBlockHeight,
//       feePayer: new PublicKey(res || ""),
//     }).add(TransactionInstruction);
//     const res_tx = await torus?.sendTransaction(transaction);

//     debugConsole(res_tx as string);
//   } catch (e) {
//     log.error(e);
//     debugConsole(e as string);
//   }
// };

const signTransaction = async () => {
  // const block = await conn.getLatestBlockhash("finalized");
  const TransactionInstruction = SystemProgram.transfer({
    fromPubkey: new PublicKey(publicKeys![0]),
    toPubkey: new PublicKey(publicKeys![0]),
    lamports: 0.01 * LAMPORTS_PER_SOL,
  });
  const latestBlockhash = await conn.getLatestBlockhash();
  // create v0 compatible message
  const messageV0 = new TransactionMessage({
    payerKey: new PublicKey(publicKeys![0]),
    instructions: [TransactionInstruction],
    recentBlockhash: latestBlockhash.blockhash,
  }).compileToV0Message();
  const transactionV0 = new VersionedTransaction(messageV0);

  try {
    const res = await torus?.signTransaction(transactionV0);
    const hash = await conn.sendRawTransaction((res as VersionedTransaction).serialize());
    debugConsole(JSON.stringify(res), hash);
  } catch (e) {
    log.error(e);
    debugConsole(e as string);
  }
};

// MAKE SURE browser allow pop up from this site
const signAllTransaction = async () => {
  const block = await conn.getLatestBlockhash("finalized");

  function getNewTx() {
    // create v0 compatible message
    let inst = SystemProgram.transfer({
      fromPubkey: new PublicKey(publicKeys![0]),
      toPubkey: new PublicKey(publicKeys![0]),
      lamports: Math.floor(0.1 * Math.random() * LAMPORTS_PER_SOL),
    });
    const messageV0 = new TransactionMessage({
      payerKey: new PublicKey(publicKeys![0]),
      instructions: [inst],
      recentBlockhash: block.blockhash,
    }).compileToV0Message();
    const transactionV0 = new VersionedTransaction(messageV0);
    return transactionV0;
  }

  try {
    const res = await torus?.signAllTransactions([getNewTx(), getNewTx(), getNewTx()]);
    const serializedTxns = res?.map((x) => x.serialize());

    let promises: Promise<string>[] = [];
    serializedTxns?.forEach((buffer) => {
      promises.push(conn.sendRawTransaction(buffer));
    });
    let data = await Promise.all(promises);
    console.log(data);
    debugConsole(JSON.stringify(res), data);
  } catch (e) {
    log.error(e);
    debugConsole(e as string);
  }
};

const signTransactionLegacy = async (isOldImplementation = false) => {
  const block = await conn.getLatestBlockhash("finalized");
  const TransactionInstruction = SystemProgram.transfer({
    fromPubkey: new PublicKey(publicKeys![0]),
    toPubkey: new PublicKey(publicKeys![0]),
    lamports: 0.01 * LAMPORTS_PER_SOL,
  });
  let transaction = new Transaction({
    blockhash: block.blockhash,
    lastValidBlockHeight: block.lastValidBlockHeight,
    feePayer: new PublicKey(publicKeys![0]),
  }).add(TransactionInstruction);
  try {
    const res = (await torus?.signTransaction(transaction)) as Transaction;
    let hash = await conn.sendRawTransaction(res.serialize());
    debugConsole(JSON.stringify(res), hash);
  } catch (e) {
    log.error(e);
    debugConsole(e as string);
  }
};

const signAllTransactionLegacy = async (isOldImplementation = false) => {
  const block = await conn.getLatestBlockhash("finalized");
  function getNewTx() {
    let inst = SystemProgram.transfer({
      fromPubkey: new PublicKey(publicKeys![0]),
      toPubkey: new PublicKey(publicKeys![0]),
      lamports: Math.floor(0.1 * Math.random() * LAMPORTS_PER_SOL),
    });
    return new Transaction({ recentBlockhash: block.blockhash, feePayer: new PublicKey(publicKeys![0]) }).add(inst);
  }
  try {
    const res = await torus?.signAllTransactions([getNewTx(), getNewTx(), getNewTx()]);
    const serializedTxns = res?.map((x) => x.serialize());
    let promises: Promise<string>[] = [];
    serializedTxns?.forEach((buffer) => {
      promises.push(conn.sendRawTransaction(buffer));
    });
    let data = await Promise.all(promises);
    console.log(data);
    // debugConsole(JSON.stringify(res));
  } catch (e) {
    log.error(e);
    debugConsole(e as string);
  }
};

async function sendTransactionV0(connection: Connection, instructions: TransactionInstruction[], payer: PublicKey): Promise<void> {
  let { blockhash } = await connection.getLatestBlockhash();

  const messageV0 = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  const tx = new VersionedTransaction(messageV0);
  const sx = await torus?.sendTransaction(tx);

  console.log(`** -- Signature: ${sx}`);
}

const testInstr = async () => {
  const TransactionInstruction = SystemProgram.transfer({
    fromPubkey: new PublicKey(publicKeys![0]),
    toPubkey: new PublicKey("9Zzn5KGrjKzJvYbHWgzz6hJkFdGUPg6nMg6RtaLTWbGK"),
    lamports: 0.01 * LAMPORTS_PER_SOL,
  });
  await sendTransactionV0WithLookupTable([TransactionInstruction], new PublicKey(publicKeys![0]));
};

const findLookUpTable = async (pubKey: PublicKey) => {
  const { value } = await conn.getAddressLookupTable(pubKey);
  return value as AddressLookupTableAccount;
};

const findArgs = async (
  messageV0: VersionedMessage
): Promise<
  | {
      addressLookupTableAccounts: AddressLookupTableAccount[];
    }
  | undefined
> => {
  const isALTx = messageV0.addressTableLookups.length;
  let args = undefined;
  if (isALTx) {
    const altPubKeys = messageV0.addressTableLookups.map((atl) => atl.accountKey);
    let lookupTableAccount: AddressLookupTableAccount[] = [];
    lookupTableAccount = await Promise.all(altPubKeys.map((pubKey) => findLookUpTable(pubKey)));
    args = lookupTableAccount.length ? { addressLookupTableAccounts: lookupTableAccount } : undefined;
  }
  return args;
};

async function sendTransactionV0WithLookupTable(instructions: TransactionInstruction[], payer: PublicKey): Promise<void> {
  let lt = "9Zzn5KGrjKzJvYbHWgzz6hJkFdGUPg6nMg6RtaLTWbGK";

  let lookupTablePubkey = new PublicKey(lt);
  // let lookupTablePubkey: PublicKey = new PublicKey("HA2sXbDdotvyZX6LF3wBd8vgqt591b1qR4Yu6chG7ctE")
  const { value: lookupTableAccount } = await conn.getAddressLookupTable(lookupTablePubkey);

  console.log("testing information");
  console.log("lookupTableAccount", lookupTableAccount);
  let { blockhash } = await conn.getLatestBlockhash();

  if (lookupTableAccount) {
    const messageV0 = new TransactionMessage({
      payerKey: payer,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message([lookupTableAccount]);
    const tx = new VersionedTransaction(messageV0);

    const args = await findArgs(messageV0);
    console.log(TransactionMessage.decompile(messageV0, args));
    console.log(Buffer.from(tx.message.serialize()).toString("base64"));
    const sx = await torus?.sendTransaction(tx);

    console.log(`** -- Signature: ${sx}`);
  }
}

const signMessage = async () => {
  try {
    let msg = Buffer.from("Test Signing Message ", "utf8");
    const res = await torus?.signMessage(msg);
    nacl.sign.detached.verify(msg, res as Uint8Array, new PublicKey(publicKeys![0]).toBytes());
    debugConsole(JSON.stringify(res));
  } catch (e) {
    log.error(e);
    debugConsole(JSON.stringify(e));
  }
};

const changeProvider = async () => {
  const toNetwork = network.value === SUPPORTED_NETWORKS["mainnet"].displayName ? "testnet" : "mainnet";
  const providerRes = await torus?.setProvider(SUPPORTED_NETWORKS[toNetwork]);
  network.value = SUPPORTED_NETWORKS[toNetwork].displayName;
  conn = new Connection(SUPPORTED_NETWORKS[toNetwork].rpcTarget);
};

const getUserInfo = async () => {
  const info = await torus?.getUserInfo();
  debugConsole(JSON.stringify(info));
};

const toggleButton = async () => {
  const toggleChecked = (document.getElementById("default-toggle") as HTMLInputElement)?.checked;
  if (!toggleChecked) {
    await torus?.hideTorusButton();
    // showButton.value = false;
  } else {
    await torus?.showTorusButton();
    // showButton.value = true;
  }
  debugConsole(toggleChecked ? "show button" : "hide button");
};

const topup = async () => {
  if (!isTopupHidden.value) {
    try {
      const result = await torus?.initiateTopup("rampnetwork", {
        selectedAddress: "3zLbFcrLPYk1hSdXdy1jcBRpeeXrhC47iCSjdwqsUaf9",
      });
      if (result) debugConsole("Top Up Successful");
    } catch {
      debugConsole("Top Up Failed");
    }
  }
};

const debugConsole = async (...text: any[]) => {
  if (consoleDiv.value) {
    // consoleDiv.value.innerHTML = typeof text === "object" ? JSON.stringify(text) : text;
    let data = "";
    text.forEach((x) => {
      data += "-" + JSON.stringify(x) + "\n";
    });
    consoleDiv.value.innerHTML = data;
  }
  const consoleBtn = document.querySelector<HTMLElement>("#console>div.clear-console-btn");
  if (consoleBtn) {
    consoleBtn.style.display = "block";
  }
};

const airdrop = async () => {
  await conn.requestAirdrop(new PublicKey(pubkey.value), 1 * LAMPORTS_PER_SOL);
};

const sendusdc = async () => {
  // const usdcmint = network.value === "testnet" ? "CpMah17kQEL2wqyMKt3mZBdTnZbkbfx4nqmQMFDP5vwp" : "";
  const usdcmint = "CpMah17kQEL2wqyMKt3mZBdTnZbkbfx4nqmQMFDP5vwp";
  const inst = await getSplInstructions(conn, pubkey.value, pubkey.value, 1, usdcmint);
  const latestBlockhash = await conn.getLatestBlockhash();
  // create v0 compatible message
  const messageV0 = new TransactionMessage({
    payerKey: new PublicKey(publicKeys![0]),
    instructions: inst,
    recentBlockhash: latestBlockhash.blockhash,
  }).compileToV0Message();
  const transactionV0 = new VersionedTransaction(messageV0);

  await torus?.sendTransaction(transactionV0);
  // const result = await conn.sendRawTransaction(transaction.serialize())
};

const lookup = "Eu8Pv3TRDYjqSZxQ7UfKQZr5jYZTZwhCvxd4UWLKUq3L";
const mintAddress = "2Ce9Bhf5oi9k1yftvgQUeCXf2ZUhasUPEcbWLktpDtv5";

const mintAdminSrt = [
  75, 62, 204, 173, 88, 58, 245, 115, 230, 162, 141, 243, 101, 197, 220, 230, 6, 106, 50, 85, 249, 51, 227, 43, 223, 176, 10, 129, 76, 139, 106, 3,
  134, 111, 220, 26, 52, 217, 174, 38, 102, 164, 15, 39, 205, 92, 223, 133, 63, 183, 60, 38, 89, 23, 196, 253, 116, 105, 23, 255, 166, 196, 220, 189,
];
const mintAdmin = Keypair.fromSecretKey(Buffer.from(mintAdminSrt));

const generateVersionedTransaction = async (payerKey: PublicKey, instructions: TransactionInstruction[]) => {
  const latestBlockhash = await conn.getLatestBlockhash();
  // create v0 compatible message
  const messageV0 = new TransactionMessage({
    payerKey,
    instructions,
    recentBlockhash: latestBlockhash.blockhash,
  }).compileToV0Message();
  const transactionV0 = new VersionedTransaction(messageV0);
  return transactionV0;
};

const mintToken = async (mintAddress: string) => {
  // mint token
  const mint = new PublicKey(mintAddress);
  const dest = new PublicKey(pubkey.value);
  const tokenaccount = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, mint, dest);
  const tokenaccountInfo = await conn.getAccountInfo(tokenaccount);
  // log.error(tokenaccountInfo?.owner.toBase58())
  const inst: TransactionInstruction[] = [];
  if (!tokenaccountInfo?.owner.equals(TOKEN_PROGRAM_ID))
    inst.push(
      Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        new PublicKey(mintAddress),
        tokenaccount,
        dest,
        dest
      )
    );

  inst.push(await Token.createMintToInstruction(TOKEN_PROGRAM_ID, mint, tokenaccount, mintAdmin.publicKey, [], 1 * LAMPORTS_PER_SOL));

  const transactionV0 = await generateVersionedTransaction(new PublicKey(pubkey.value), inst);
  transactionV0.sign([mintAdmin as Signer]);

  // log.error(transaction.signatures)
  // log.error(transaction.signatures.map(item=> item.publicKey.toBase58()))

  // transaction.sig
  // const result = await torus?.sendTransaction(transaction);
  const signedTransaction = await torus?.signTransaction(transactionV0);
  const result = await conn.sendRawTransaction(signedTransaction?.serialize() || []);
  // const result = await conn.sendRawTransaction(transaction.serialize());
  debugConsole(result || "");
};

const lookupDepositSol = async () => {
  const inst = await createDeposit(conn, secp.getPublic("hex"), new PublicKey(lookup), new PublicKey(pubkey.value), 0.1);
  const block = await conn.getLatestBlockhash();
  const transactionV0 = await generateVersionedTransaction(new PublicKey(pubkey.value), inst);

  const signedTransaction = await torus?.signTransaction(transactionV0);
  const result = await conn.sendRawTransaction(signedTransaction?.serialize() || []);
  debugConsole(result || "");
};
const lookupDepositSPL = async (mintAddress: string) => {
  const inst = await createDeposit(conn, secp.getPublic("hex"), new PublicKey(lookup), new PublicKey(pubkey.value), 1, new PublicKey(mintAddress));

  const transactionV0 = await generateVersionedTransaction(new PublicKey(pubkey.value), inst);
  const signedTransaction = await torus?.signTransaction(transactionV0);

  const result = await conn.sendRawTransaction(signedTransaction?.serialize() || []);
  // const result = await torus?.sendTransaction(transaction);
  // const result = await conn.sendRawTransaction(transaction.serialize());
  debugConsole(result || "");
};
const lookupRedeemSol = async () => {
  const hashValue = createHash("sha256").update("lookup").digest("hex");
  const signature = secp.sign(hashValue);

  const inst = await redeemSol(secp.getPublic("hex"), signature, hashValue, new PublicKey(lookup), new PublicKey(pubkey.value));

  const transactionV0 = await generateVersionedTransaction(new PublicKey(pubkey.value), inst);
  const signedTransaction = await torus?.signTransaction(transactionV0);
  const result = await conn.sendRawTransaction(signedTransaction?.serialize() || []);
  // const result = await torus?.sendTransaction(transaction);
  // const result = await conn.sendRawTransaction(transaction.serialize());
  debugConsole(result || "");
};
const lookupRedeemSPL = async (mintAddress: string) => {
  // const dest =pubkey.value;
  const hashValue = createHash("sha256").update("lookup").digest("hex");
  const signature = secp.sign(hashValue);

  const signer = new PublicKey(pubkey.value);
  const mintAccount = new PublicKey(mintAddress);

  const receiver = signer;
  // const receiver = mintAdmin.publicKey;
  const dest = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, mintAccount, receiver);
  const destAccountInfo = await conn.getAccountInfo(dest);

  const inst: TransactionInstruction[] = [];

  if (!destAccountInfo)
    inst.push(Token.createAssociatedTokenAccountInstruction(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, mintAccount, dest, receiver, signer));

  // redeem instruction
  inst.push(...(await redeemSplToken(conn, secp.getPublic("hex"), signature, hashValue, new PublicKey(lookup), mintAccount, signer, dest)));

  const transactionV0 = await generateVersionedTransaction(new PublicKey(pubkey.value), inst);
  const signedTransaction = await torus?.signTransaction(transactionV0);

  const result = await conn.sendRawTransaction(signedTransaction?.serialize() || []);
  // const result = await torus?.sendTransaction(transaction);
  // const result = await conn.sendRawTransaction(transaction.serialize());
  debugConsole(result || "");
};
function copyToClip(account: string) {
  copied.value = true;
  copyToClipboard(account);
  setTimeout(() => {
    copied.value = false;
  }, 500);
}
function getNetworkType(network: string) {
  if (network === "devnet") return "Solana Mainnet";
  return network;
}
function getAddress(address: string) {
  if (address.length < 11) {
    return address;
  }
  if (typeof address !== "string") return "";
  return `${address.slice(0, 5)}...${address.slice(-5)}`;
}
const clearUiconsole = (): void => {
  if (consoleDiv.value) consoleDiv.value.innerHTML = "";
  const consoleBtn = document.querySelector<HTMLElement>("#console>div.clear-console-btn");
  if (consoleBtn) {
    consoleBtn.style.display = "none";
  }
};
const copyAccountAddress = () => {
  navigator.clipboard.writeText(pubkey.value);
  isCopied.value = true;
  setTimeout(() => (isCopied.value = false), 1000);
};
</script>

<template>
  <div id="app">
    <div class="flex flex-col items-center justify-center h-screen" v-if="!pubkey">
      <h1 class="font-semibold text-3xl mb-5">Login and Resets</h1>
      <p class="text-lg font-medium text-gray-600 capitalize">Build Environment : {{ buildEnv }}</p>
      <p class="text-sm font-normal text-gray-500 mb-8">Note: This is a testing application. Please open console for debugging</p>
      <div class="flex flex-col">
        <label class="btn-label">Select build environment</label>
        <select name="buildEnv" v-model="buildEnv" class="login-input w-[320px] border-app-gray-400 !border bg-dropdown">
          <option value="production">Production</option>
          <option value="testing">Testing</option>
          <option value="development">Development</option>
        </select>
      </div>
      <div>
        <button @click="login(false)" class="custom-btn mt-4 w-[320px]">Login</button>
      </div>
      <h6 class="py-2 text-sm text-gray-400">or</h6>
      <div class="pb-2 flex items-start justify-start w-[320px]">
        <label class="btn-label text-start">White Labelling</label>
      </div>
      <div class="w-[320px]">
        <button @click="login(true)" class="custom-btn w-full">Login With White Labelling</button>
      </div>
      <h6 class="py-2 text-sm text-gray-400">or</h6>
      <div class="w-[320px] flex flex-col">
        <label class="btn-label text-start">Private Key</label>
        <input
          placeholder="Enter private key from web3auth to login"
          v-model="privateKey"
          class="login-input text-sm w-[320px] border-app-gray-400 !border"
        />
      </div>
      <div>
        <button @click="loginWithPrivateKey" class="custom-btn mt-4 w-[320px]">Login with Private Key</button>
      </div>
    </div>
    <div v-else class="dashboard-container">
      <!-- Dashboard Header -->
      <div class="dashboard-header">
        <div>
          <h1 class="dashboard-heading">demo-solana.tor.us</h1>
          <p class="dashboard-subheading">Build environment : {{ buildEnv }}</p>
        </div>
        <div class="dashboard-action-container">
          <button class="dashboard-action-address" @click.stop="copyAccountAddress" :title="pubkey">
            <img :src="require('../../assets/copy.svg')" alt="logout" height="14" width="14" />{{ getAddress(pubkey) }}
          </button>
          <div class="dashboard-action-badge">
            <img :src="require('../../assets/wifi.svg')" alt="logout" height="14" width="14" />{{ getNetworkType(network) }}
          </div>
          <button class="dashboard-action-logout" @click.stop="logout">
            <img :src="require('../../assets/logout.svg')" alt="logout" height="20" width="20" />
            Logout
          </button>
        </div>
      </div>
      <!-- Dashboard Action Container -->
      <div class="dashboard-details-container">
        <div class="dashboard-details-btn-container">
          <h1 class="text-xl font-bold text-gray-900 mb-6">Torus APIs</h1>
          <div class="mb-6">
            <label for="default-toggle" class="inline-flex relative items-center cursor-pointer">
              <input type="checkbox" id="default-toggle" class="sr-only peer" @click="toggleButton" />
              <div
                class="w-11 h-6 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
              ></div>
              <span class="ml-3 text-sm font-normal text-gray-400">Show Torus Button</span>
            </label>
          </div>
          <div class="details-container">
            <div class="flex-row bottom-gutter">
              <div>
                <p class="btn-label">User info</p>
                <button class="custom-btn" @click="getUserInfo">Get User Info</button>
              </div>
              <div>
                <p class="btn-label">Provider</p>
                <button class="custom-btn" @click="changeProvider">Change Provider</button>
              </div>
              <div>
                <p class="btn-label">Top up Wallet</p>
                <button class="custom-btn" @click="topup">Top up</button>
              </div>
            </div>
            <h1 class="text-xl font-bold text-gray-900 mb-6">Blockchain APIs</h1>
            <p class="btn-label">Signing</p>
            <div class="flex-row bottom-gutter">
              <button class="custom-btn" @click="signTransaction">Sign versioned txn</button>
              <button class="custom-btn" @click="() => signTransactionLegacy(false)">Sign legacy transaction</button>
            </div>
            <div class="flex-row bottom-gutter">
              <button class="custom-btn" @click="signAllTransaction">Sign all versioned txn</button>
              <button class="custom-btn" @click="() => signAllTransactionLegacy(false)">Sign all legacy txn</button>
            </div>
            <div class="flex-row bottom-gutter">
              <button class="custom-btn" @click="signMessage">Sign Message</button>
              <button class="custom-btn" @click="sendMultipleInstructionTransaction">Multiple Instruction txn</button>
            </div>
            <div class="flex-row bottom-gutter">
              <button class="custom-btn" @click="testInstr">Send versioned ALT table transaction</button>
            </div>
            <p class="btn-label">Transactions</p>
            <div class="flex-row bottom-gutter">
              <button class="custom-btn" @click="transfer">Send Transaction</button>
              <button class="custom-btn" @click="() => transferLegacy(false)">Send Legacy txn</button>
            </div>
            <div class="flex-row bottom-gutter">
              <button class="custom-btn" @click="transferSPL">Send SPL Transaction</button>
            </div>
            <p class="btn-label">
              SPL transfer example :
              <span class="text-xs text-gray-500 font-normal">
                Get testnet usdc <a href="https://usdcfaucet.com/" target="blank" class="text-blue-600 underline">here</a>
              </span>
            </p>
            <div class="flex-row bottom-gutter">
              <button
                class="custom-btn disabled:!text-gray-200 disabled:border-gray-200 disabled:cursor-not-allowed"
                @click="sendusdc"
                :disabled="network !== testnet"
              >
                Send USDC
              </button>
              <button
                class="custom-btn disabled:!text-gray-200 disabled:border-gray-200 disabled:cursor-not-allowed"
                @click="airdrop"
                :disabled="network !== testnet"
              >
                Request SOL Airdrop
              </button>
            </div>
            <p class="btn-label">Custom Program Example (Solana-Lookup) (Testnet only)</p>
            <div class="flex-row bottom-gutter">
              <button
                class="custom-btn disabled:!text-gray-200 disabled:border-gray-200 disabled:cursor-not-allowed"
                @click="lookupDepositSol"
                :disabled="network !== testnet"
              >
                Depositor SOL
              </button>
              <button
                class="custom-btn disabled:!text-gray-200 disabled:border-gray-200 disabled:cursor-not-allowed"
                @click="lookupRedeemSol"
                :disabled="network !== testnet"
              >
                Redeem SOL
              </button>
            </div>
            <div class="flex-row bottom-gutter">
              <button
                class="custom-btn disabled:!text-gray-200 disabled:border-gray-200 disabled:cursor-not-allowed"
                @click="() => mintToken(mintAddress)"
                :disabled="network !== testnet"
              >
                MintToken
              </button>
              <button
                class="custom-btn disabled:!text-gray-200 disabled:border-gray-200 disabled:cursor-not-allowed"
                @click="() => lookupDepositSPL(mintAddress)"
                :disabled="network !== testnet"
              >
                Deposit SPL
              </button>
            </div>
            <div class="flex-row bottom-gutter">
              <button
                class="custom-btn disabled:!text-gray-200 disabled:border-gray-200 disabled:cursor-not-allowed"
                @click="() => lookupRedeemSPL(mintAddress)"
                :disabled="network !== testnet"
              >
                Redeem SPL
              </button>
            </div>
          </div>
        </div>
        <!-- Dashboard Console Container -->
        <div class="dashboard-details-console-container" id="console">
          <h1 class="console-heading"></h1>
          <pre ref="consoleDiv" class="console-container"></pre>
          <div class="clear-console-btn">
            <button class="custom-btn console-btn" @click="clearUiconsole">Clear console</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
@import "./Dashboard.css";
</style>
