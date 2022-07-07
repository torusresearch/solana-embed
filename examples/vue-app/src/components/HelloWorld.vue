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
} from "@solana/web3.js";
import Torus, { TORUS_BUILD_ENV_TYPE } from "@toruslabs/solana-embed";
import { SUPPORTED_NETWORKS, CHAINS } from "../assets/const";
import nacl from "tweetnacl";
import log from "loglevel";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { createDeposit, createRedeemSolInstruction, createRedeemInstruction, redeemSol, redeemSplToken } from "@cwlee/solana-lookup-sdk";
import { getSplInstructions } from "./helper";
import { ec as EC } from "elliptic";
import { createHash } from "crypto";
import copyToClipboard from "copy-to-clipboard";

const ec = new EC("secp256k1");
const secp = ec.genKeyPair({ entropy: "maximumentroyneededfortesting" });
let torus: Torus | null;
let conn: Connection;
let publicKeys: string[] | undefined;

const privateKey = ref();
const network = ref("");
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

const login = async () => {
  try {
    if (!torus) {
      torus = new Torus();
    }

    if (!torus.isInitialized) {
      await torus.init({
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
    // console.log(torus);
    publicKeys = await torus?.login({});
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

  let transaction = new Transaction({
    blockhash: block.blockhash,
    lastValidBlockHeight: block.lastValidBlockHeight,
    feePayer: new PublicKey(publicKeys![0]),
  }).add(transferInstructions);
  try {
    const res = await torus?.sendTransaction(transaction);
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
  const lamports = 123;
  const transactionStaking = StakeProgram.createAccount({
    fromPubkey,
    stakePubkey: newAccountPubkey,
    authorized,
    lockup,
    lamports,
  });
  const [systemInstruction, stakeInstruction] = transactionStaking.instructions;

  const TransactionInstruction2 = SystemProgram.transfer({
    fromPubkey: new PublicKey(publicKeys![0]),
    toPubkey: new PublicKey(publicKeys![0]),
    lamports: 0.01 * LAMPORTS_PER_SOL,
  });

  let transaction = new Transaction({
    blockhash: block.blockhash,
    lastValidBlockHeight: block.lastValidBlockHeight,
    feePayer: new PublicKey(publicKeys![0]),
  })
    .add(stakeInstruction)
    .add(TransactionInstruction2);
  try {
    const res = await torus?.sendTransaction(transaction);
    debugConsole(res as string);
  } catch (e) {
    log.error(e);
    debugConsole(e as string);
  }
};

const gaslessTransfer = async () => {
  const block = await conn.getLatestBlockhash("finalized");
  const TransactionInstruction = SystemProgram.transfer({
    fromPubkey: new PublicKey(publicKeys![0]),
    toPubkey: new PublicKey(publicKeys![0]),
    lamports: 0.01 * LAMPORTS_PER_SOL,
  });
  try {
    const res = await torus?.getGaslessPublicKey();
    let transaction = new Transaction({
      blockhash: block.blockhash,
      lastValidBlockHeight: block.lastValidBlockHeight,
      feePayer: new PublicKey(res || ""),
    }).add(TransactionInstruction);
    const res_tx = await torus?.sendTransaction(transaction);

    debugConsole(res_tx as string);
  } catch (e) {
    log.error(e);
    debugConsole(e as string);
  }
};

const signTransaction = async () => {
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
    const res = await torus?.signTransaction(transaction);
    debugConsole(JSON.stringify(res));
  } catch (e) {
    log.error(e);
    debugConsole(e as string);
  }
};

// MAKE SURE browser allow pop up from this site
const signAllTransaction = async () => {
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
  try {
    const result = await torus?.initiateTopup("rampnetwork", {
      selectedAddress: "3zLbFcrLPYk1hSdXdy1jcBRpeeXrhC47iCSjdwqsUaf9",
    });
    if (result) debugConsole("Top Up Successful");
  } catch {
    debugConsole("Top Up Failed");
  }
};

const debugConsole = async (text: string) => {
  // document.querySelector("#console > p")!.innerHTML = typeof text === "object" ? JSON.stringify(text) : text;
  consoleDiv.value.innerHTML = typeof text === "object" ? JSON.stringify(text) : text;
};

const airdrop = async () => {
  await conn.requestAirdrop(new PublicKey(pubkey.value), 1 * LAMPORTS_PER_SOL);
};

const sendusdc = async () => {
  // const usdcmint = network.value === "testnet" ? "CpMah17kQEL2wqyMKt3mZBdTnZbkbfx4nqmQMFDP5vwp" : "";
  const usdcmint = "CpMah17kQEL2wqyMKt3mZBdTnZbkbfx4nqmQMFDP5vwp";
  const inst = await getSplInstructions(conn, pubkey.value, pubkey.value, 1, usdcmint);
  const block = await conn.getLatestBlockhash();
  const transaction = new Transaction({
    feePayer: new PublicKey(pubkey.value),
    blockhash: block.blockhash,
    lastValidBlockHeight: block.lastValidBlockHeight,
  });
  transaction.add(...inst);

  await torus?.sendTransaction(transaction);
  // const result = await conn.sendRawTransaction(transaction.serialize())
};

const lookup = "Eu8Pv3TRDYjqSZxQ7UfKQZr5jYZTZwhCvxd4UWLKUq3L";
const mintAddress = "2Ce9Bhf5oi9k1yftvgQUeCXf2ZUhasUPEcbWLktpDtv5";

const mintAdminSrt = [
  75, 62, 204, 173, 88, 58, 245, 115, 230, 162, 141, 243, 101, 197, 220, 230, 6, 106, 50, 85, 249, 51, 227, 43, 223, 176, 10, 129, 76, 139, 106, 3,
  134, 111, 220, 26, 52, 217, 174, 38, 102, 164, 15, 39, 205, 92, 223, 133, 63, 183, 60, 38, 89, 23, 196, 253, 116, 105, 23, 255, 166, 196, 220, 189,
];
const mintAdmin = Keypair.fromSecretKey(Buffer.from(mintAdminSrt));
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

  const block = await conn.getLatestBlockhash();
  const transaction = new Transaction({
    feePayer: new PublicKey(pubkey.value),
    blockhash: block.blockhash,
    lastValidBlockHeight: block.lastValidBlockHeight,
  });
  transaction.add(...inst);
  transaction.partialSign(mintAdmin);

  // log.error(transaction.signatures)
  // log.error(transaction.signatures.map(item=> item.publicKey.toBase58()))

  // transaction.sig
  // const result = await torus?.sendTransaction(transaction);
  const signedTransaction = await torus?.signTransaction(transaction);
  const result = await conn.sendRawTransaction(signedTransaction?.serialize() || []);
  // const result = await conn.sendRawTransaction(transaction.serialize());
  debugConsole(result || "");
};

const lookupDepositSol = async () => {
  const inst = await createDeposit(conn, secp.getPublic("hex"), new PublicKey(lookup), new PublicKey(pubkey.value), 0.1);
  const block = await conn.getLatestBlockhash();
  const transaction = new Transaction({
    feePayer: new PublicKey(pubkey.value),
    blockhash: block.blockhash,
    lastValidBlockHeight: block.lastValidBlockHeight,
  });
  transaction.add(...inst);
  // const result = await torus?.sendTransaction(transaction);
  const signedTransaction = await torus?.signTransaction(transaction);
  const result = await conn.sendRawTransaction(signedTransaction?.serialize() || []);
  debugConsole(result || "");
};
const lookupDepositSPL = async (mintAddress: string) => {
  const inst = await createDeposit(conn, secp.getPublic("hex"), new PublicKey(lookup), new PublicKey(pubkey.value), 1, new PublicKey(mintAddress));
  const block = await conn.getLatestBlockhash();
  const transaction = new Transaction({
    feePayer: new PublicKey(pubkey.value),
    blockhash: block.blockhash,
    lastValidBlockHeight: block.lastValidBlockHeight,
  });
  transaction.add(...inst);
  const signedTransaction = await torus?.signTransaction(transaction);
  const result = await conn.sendRawTransaction(signedTransaction?.serialize() || []);
  // const result = await torus?.sendTransaction(transaction);
  // const result = await conn.sendRawTransaction(transaction.serialize());
  debugConsole(result || "");
};
const lookupRedeemSol = async () => {
  const hashValue = createHash("sha256").update("lookup").digest("hex");
  const signature = secp.sign(hashValue);

  const inst = await redeemSol(secp.getPublic("hex"), signature, hashValue, new PublicKey(lookup), new PublicKey(pubkey.value));
  const block = await conn.getLatestBlockhash();
  const transaction = new Transaction({
    feePayer: new PublicKey(pubkey.value),
    blockhash: block.blockhash,
    lastValidBlockHeight: block.lastValidBlockHeight,
  });
  transaction.add(...inst);
  const signedTransaction = await torus?.signTransaction(transaction);
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

  const block = await conn.getLatestBlockhash();
  const transaction = new Transaction({
    feePayer: new PublicKey(pubkey.value),
    blockhash: block.blockhash,
    lastValidBlockHeight: block.lastValidBlockHeight,
  });
  transaction.add(...inst);

  const signedTransaction = await torus?.signTransaction(transaction);
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
  consoleDiv.value.innerHTML = "";
};
</script>

<template>
  <div id="app">
    <div class="grid text-center justify-center pt-20" v-if="!pubkey">
      <h7 class="font-bold text-3xl">Login and resets</h7>
      <h6 class="font-semibold text-[#595857]">Build Environment : {{ buildEnv }}</h6>
      <h6 class="pb-4 text-[#595857]">Note: This is a testing application. Please open console for debugging</h6>
      <div class="pb-2">
        <h3 class="font-semibold text-[#595857]">Select build environment</h3>
        <select name="buildEnv" v-model="buildEnv" class="select-menu bg-dropdown p-1">
          <option value="production">Production</option>
          <option value="testing">Testing</option>
          <option value="development">Development</option>
        </select>
      </div>
      <div>
        <button @click="login" class="btn-login">Login</button>
      </div>
      <h6 class="py-4 text-[#595857]">or</h6>
      <div class="pb-2">
        <h3 class="font-semibold text-[#595857]">Private Key</h3>
        <input placeholder="https://example.com/" v-model="privateKey" class="btn-login px-4 py-2" />
      </div>
      <div>
        <button @click="loginWithPrivateKey" class="btn-login">Login with Private Key</button>
      </div>
    </div>
    <div v-else>
      <div class="flex box md:rows-span-2 m-6 items-center py-4">
        <div class="ml-6">
          <h7 class="text-2xl font-semibold">demo-solana.tor.us</h7>
          <h6 class="text-left">Build environment : {{ buildEnv }}</h6>
        </div>
        <div class="ml-auto">
          <button
            type="button"
            class="copy-btn"
            @click="
              () => {
                copyToClip(pubkey);
              }
            "
          >
            <img class="pr-1" src="../assets/copy.svg" />
            <span>{{ copied ? "Copied!" : getAddress(pubkey) }}</span>
          </button>
          <button type="button" class="wifi-btn">
            <img src="../assets/wifi.svg" />
            <div class="font-semibold pl-1">{{ getNetworkType(network) }}</div>
          </button>
          <button type="button" @click="logout" class="btn-logout">
            <img src="../assets/logout.svg" class="pr-3 pl-0" />
            Logout
          </button>
        </div>
      </div>
      <div class="grid grid-cols-5 gap-7 m-6 height-fit">
        <div class="grid grid-cols-2 col-span-5 md:col-span-2 text-left gap-2 p-4 box md:pb-74">
          <div class="col-span-2">
            <h7 class="text-xl font-semibold">Torus APIs</h7>
            <div>
              <label for="default-toggle" class="inline-flex relative items-center cursor-pointer">
                <input type="checkbox" id="default-toggle" class="sr-only peer" @click="toggleButton" />
                <div
                  class="w-11 h-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
                ></div>
                <span class="ml-3 text-sm font-medium">Show Torus Button</span>
              </label>
            </div>
          </div>
          <div class="col-span-1">
            <div class="font-semibold">User Info</div>
            <div><button class="btn" @click="getUserInfo">Get User Info</button></div>
          </div>
          <div class="col-span-1">
            <div class="font-semibold">Provider</div>
            <div><button class="btn" @click="changeProvider">Change Provider</button></div>
          </div>
          <div class="col-span-1">
            <div class="font-semibold">Top-up wallet</div>
            <div><button @click="topup" class="btn">Top Up</button></div>
          </div>
          <!-- <div class="col-span-1">
          <div class="font-semibold">Signing</div>
          <div><button class="btn" @click="signMessage">Sign message</button></div>
        </div> -->
          <div class="col-span-2">
            <h7 class="text-xl font-semibold">Blockchain APIs</h7>
          </div>
          <div class="col-span-2 text-left">
            <div class="font-semibold">Signing</div>
            <div class="grid grid-cols-2 gap-2">
              <button @click="signTransaction" class="btn">Sign Transaction</button>
              <button @click="signAllTransaction" class="btn">Sign All Transactions</button>
              <button @click="signMessage" class="btn">Sign Message</button>
              <button @click="sendMultipleInstructionTransaction" class="btn">Multiple Instruction tx</button>
            </div>
          </div>
          <div class="col-span-2 text-left">
            <div class="font-semibold">Transactions</div>
            <div class="grid grid-cols-2 gap-2">
              <button @click="transfer" class="btn">Send Transaction</button>
              <button @click="transferSPL" class="btn">Send SPL Transaction</button>
            </div>
          </div>
          <div class="col-span-2 text-left">
            <div class="font-semibold">
              SPL transfer example:
              <span class="text-[grey] text-xs">Get testnet usdc <a href="https://usdcfaucet.com/" target="blank">here</a></span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <button @click="sendusdc" :disabled="network !== testnet" class="btn">Send usdc</button>
              <button @click="airdrop" :disabled="network !== testnet" class="btn-large">Request SOL Airdrop (Testnet only)</button>
            </div>
          </div>
          <div class="col-span-2 text-left">
            <div class="font-semibold">Custom Program Example (Solana-Lookup) (Testnet only)</div>
            <div class="grid grid-cols-2 gap-2">
              <button @click="lookupDepositSol" :disabled="network !== testnet" class="btn">Deposit SOL</button>
              <button @click="lookupRedeemSol" :disabled="network !== testnet" class="btn">Redeem SOL</button>

              <button @click="() => mintToken(mintAddress)" :disabled="network !== testnet" class="btn">MintToken</button>
              <button @click="() => lookupDepositSPL(mintAddress)" :disabled="network !== testnet" class="btn">Deposit SPL</button>
              <button @click="() => lookupRedeemSPL(mintAddress)" :disabled="network !== testnet" class="btn">Redeem SPL</button>
            </div>
          </div>
        </div>
        <div class="box-grey" id="console">
          <p ref="consoleDiv" style="white-space: pre-line"></p>
          <div><button class="clear-button" @click="clearUiconsole">Clear console</button></div>
        </div>
      </div>
    </div>
    <!-- <p class="font-italic">Note: This is a testing application. Please open console for debugging.</p> -->
  </div>
</template>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.box {
  @apply bg-white max-h-screen;
  border: 1px solid #f3f3f4;
  border-radius: 20px;
  box-shadow: 4px 4px 20px rgba(46, 91, 255, 0.1);
}

.box-grey {
  @apply col-span-5 md:col-span-3 overflow-hidden min-h-[400px] bg-[#f3f3f4] rounded-3xl relative;
  border: 1px solid #f3f3f4;
  box-shadow: 4px 4px 20px rgba(46, 91, 255, 0.1);
}
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
#console-wrapper {
  margin-top: auto;
}

/* #console {
  border: 1px solid black;
  height: 80px;
  padding: 2px;
  position: relative;
  text-align: left;
  width: 100%;
  border-radius: 5px;
  overflow: scroll;
} */

#console > p {
  margin: 0.5em;
  word-wrap: break-word;
}
#font-italic {
  font-style: italic;
}

ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
.break-word {
  overflow-wrap: break-word;
}
.select-menu {
  @apply h-12 w-80 rounded-3xl text-center bg-white bg-no-repeat;
  border: solid 1px;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-position: right 16px top 50%;
}
.btn {
  @apply min-h-[44px] w-full m-0 bg-white rounded-3xl text-[#6F717A] text-sm lg:text-base font-medium;
  border: 1px solid #6f717a;
}
.btn-large {
  @apply min-h-[44px] w-full m-0 bg-white rounded-3xl text-[#6F717A] text-xs lg:text-base font-medium;
  border: 1px solid #6f717a;
}
.btn:disabled {
  @apply bg-gray-100 opacity-30;
}
.btn-large:disabled {
  @apply bg-gray-100 opacity-30;
}
.copy-btn {
  @apply h-6 px-2 m-2 text-sm inline-flex items-center overflow-hidden bg-[#e9e9ea] rounded-3xl text-[#7F8FA4] leading-4 font-bold;
}

.wifi-btn {
  @apply h-6 text-sm inline-flex items-center text-center p-2 rounded-3xl bg-[#cde0ff];
}
.btn-login {
  @apply h-12 w-80 bg-white rounded-3xl;
  border: 1px solid #6f717a;
}
.btn-logout {
  @apply h-12 w-32 bg-white rounded-3xl pl-6 m-2 text-sm inline-flex items-center;
  border: 1px solid #f3f3f4;
}
.clear-button {
  @apply absolute md:fixed right-8 bottom-2 md:right-8 md:bottom-12 w-28 h-7 bg-[#f3f3f4] rounded-md;
  border: 1px solid #0f1222;
}
.height-fit {
  @apply min-h-fit;
  height: 75vh;
}
#console {
  text-align: left;
  overflow: auto;
}
#console > p {
  @apply m-2;
}
.btn {
  @apply min-h-[44px] w-full m-0 bg-white rounded-3xl text-[#6F717A] text-sm lg:text-base font-medium;
  border: 1px solid #6f717a;
}
.custom-switch {
  padding-left: 2.25rem;
}
.custom-control {
  position: relative;
  display: block;
  min-height: 1.5rem;
  padding-left: 1.5rem;
}
</style>
