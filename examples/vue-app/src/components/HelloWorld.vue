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
} from "@solana/web3.js";
import Torus, { TORUS_BUILD_ENV_TYPE } from "@toruslabs/solana-embed";
import { SUPPORTED_NETWORKS, CHAINS } from "../assets/const";
import nacl from "tweetnacl";
import log from "loglevel";
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';

import { PhantomWalletAdapter} from "@solana/wallet-adapter-wallets";
declare global {
  interface Window {
    torus: any;
  }
}

let torus: Torus | null;
let conn: Connection;
let publicKeys: string[] | undefined;
const network = ref("");
const pubkey = ref("");
const buildEnv = ref<TORUS_BUILD_ENV_TYPE>("development");
const showButton = ref(false);

let phantom = new PhantomWalletAdapter()

watch(buildEnv, (buildEnv, prevBuildEnv) => {
  if (buildEnv !== prevBuildEnv) {
    if (torus) {
      torus.cleanUp();
      torus = null;
    }
  }
});

const plogin = async ()=>{
  const pkey = await phantom.connect();
  
}
const transferSPL = async ( transaction: Transaction, source: string, dest : string, tokenMintAddress : string) => {
  const receiverAccount = new PublicKey(dest);
  const soruceAccount = new PublicKey(source )

    let associatedTokenAccount =  receiverAccount;
    let sourceAssociatedTokenAccount = soruceAccount
    try {
      associatedTokenAccount = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        new PublicKey(tokenMintAddress),
        receiverAccount 
      );
      sourceAssociatedTokenAccount = await Token.getAssociatedTokenAddress(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        new PublicKey(tokenMintAddress),
        soruceAccount
      );
    } catch (e) {
      log.warn("error getting associatedTokenAccount, account passed is possibly a token account");
    }

      const newAccount = await Token.createAssociatedTokenAccountInstruction(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        new PublicKey(tokenMintAddress),
        associatedTokenAccount,
        receiverAccount,
        soruceAccount
        
      );
      transaction.add(newAccount);
    // const transferInstructions = Token.createTransferCheckedInstruction(
    //   TOKEN_PROGRAM_ID,
    //   sourceTokenAccount,
    //   mintAccount,
    //   associatedTokenAccount,
    //   signer,
    //   [],
    //   amount,
    //   decimals
    // );
    const transferInstructions = Token.createTransferInstruction ( TOKEN_PROGRAM_ID, sourceAssociatedTokenAccount, associatedTokenAccount, soruceAccount, [], 1000000000 )
    transaction.add(transferInstructions);
    return transaction
}

const pSPLTransfer = async () => {
  const source = phantom.publicKey
  if (!source) throw Error("no key")
  console.log(source)
  new PublicKey(source.toBase58() )
  const transaction = new Transaction({})
  await transferSPL( transaction, source?.toBase58(), "4wuycuiEHNp4crsoRHh4KbEaUGjgPJS4dhUhn2he1yDs", "2gX7pofXq6YK9cDco5LPAQZfRgyodxfXjkXdeHfksTGE" )
  await transferSPL( transaction, source?.toBase58(), "4bwBtipFFLhBy5NxPiwUKMyeAik4kxoa8heTwmNhFaao", "BogPYCbnXevkaypTxTznJmGaJ1EdG9Dbf6rQ1h47KjvB" )
  await transferSPL( transaction, source?.toBase58(), "EyP2sutr9TEEC7csLnxkBKBnbT88isb3zpLmH2YLcLjJ", "GU7eu5XzArRDFJ7WhRnFj1a6TpZ67AYNXMBzamd4hxtY" )

  transaction.recentBlockhash = (await conn.getRecentBlockhash("finalized")).blockhash;

  phantom.sendTransaction( transaction , conn)
}
const splTransfer = async () => {
  let source = pubkey.value
  console.log(pubkey.value)
  if (!source) throw Error("no key")
  console.log(source)
  const transaction = new Transaction({})

  await transferSPL( transaction, source, "4wuycuiEHNp4crsoRHh4KbEaUGjgPJS4dhUhn2he1yDs", "2gX7pofXq6YK9cDco5LPAQZfRgyodxfXjkXdeHfksTGE" )
  await transferSPL( transaction, source, "4bwBtipFFLhBy5NxPiwUKMyeAik4kxoa8heTwmNhFaao", "BogPYCbnXevkaypTxTznJmGaJ1EdG9Dbf6rQ1h47KjvB" )
  await transferSPL( transaction, source, "EyP2sutr9TEEC7csLnxkBKBnbT88isb3zpLmH2YLcLjJ", "GU7eu5XzArRDFJ7WhRnFj1a6TpZ67AYNXMBzamd4hxtY" )

  transaction.recentBlockhash = (await conn.getRecentBlockhash("finalized")).blockhash;
  transaction.feePayer = new PublicKey(source)
    const res = await torus?.sendTransaction(transaction);
    debugConsole(res as string);
}
const login = async () => {
  try {
    if (!torus) {
      torus = new Torus();
    }

    if (!torus.isInitialized ) {
      await torus.init({
        buildEnv: buildEnv.value,
        network: "mainnet-beta"
      })
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
    console.log(torus)
    publicKeys = await torus?.login({});
    pubkey.value = publicKeys ? publicKeys[0] : "";
    const target_network = (await torus.provider.request({
      method: "solana_provider_config",
      params: [],
    })) as { rpcTarget: string; displayName: string };
    console.log(target_network);
    network.value = target_network.displayName;
    conn = new Connection(target_network?.rpcTarget);
  } catch (err) {
    console.error(err);
  }
};

const logout = async () => {
  torus?.logout();
  pubkey.value = "";
};

const transfer = async () => {
  const blockhash = (await conn.getRecentBlockhash("finalized")).blockhash;
  const TransactionInstruction = SystemProgram.transfer({
    fromPubkey: new PublicKey(publicKeys![0]),
    // toPubkey: new PublicKey(publicKeys![0]),
    toPubkey: new PublicKey("BMzEUbfovGzHNDocFqnFvpNpEwEJExMZYFsg262TQYBH"),
    lamports: 0.01 * LAMPORTS_PER_SOL,
  });
  let transaction = new Transaction({ recentBlockhash: blockhash, feePayer: new PublicKey(publicKeys![0]) }).add(TransactionInstruction);
  try {
    const res = await torus?.sendTransaction(transaction);
    debugConsole(res as string);
    // const res = await torus.provider.request({
    //   method: "send_transaction",
    //   params: { message: transaction.serializeMessage().toString("hex") }
    // });
  } catch (e) {
    debugConsole(e as string);
  }
};

const transferSPL = async () => {
  const blockhash = (await conn.getRecentBlockhash("finalized")).blockhash;

  // usdc mint account on mainnet
  const destinationTokenAccount = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID,
    new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), new PublicKey("GLV6NbHHV31CMQX2zn67V5Bihfcsdi1V5uGhmyLNASK9")); // Phantom account for testing, it already has a associated account

  const transferInstructions = Token.createTransferCheckedInstruction(
    TOKEN_PROGRAM_ID,
    new PublicKey("4s6Fn4vZebRRgP4mMhZk5BJnX5FJ3KzBrehzKHf5PN8j"),
    new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    destinationTokenAccount,
    new PublicKey(publicKeys![0]),
    [],
    1000000,
    6
  );

  // fida mint account on mainet
  const sourceTokenAccount = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID,
    new PublicKey("EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp"), new PublicKey(publicKeys![0]));

  const destinationTokenAccount2 = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID,
    new PublicKey("EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp"), new PublicKey("D2LtZtYTj6Aep84DGmFiUiNCgcz2J8HvhV4qortTx3mM"));

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


  let transaction = new Transaction({ recentBlockhash: blockhash, feePayer: new PublicKey(publicKeys![0]) }).add(transferInstructions).add(transferInstructions2);
  try {
    const res = await torus?.sendTransaction(transaction);
    debugConsole(res as string);
    // const res = await torus.provider.request({
    //   method: "send_transaction",
    //   params: { message: transaction.serializeMessage().toString("hex") }
    // });
  } catch (e) {
    debugConsole(e as string);
  }
};

const sendMultipleInstructionTransaction = async () => {
  const blockhash = (await conn.getRecentBlockhash("finalized")).blockhash;

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

  let transaction = new Transaction({ recentBlockhash: blockhash, feePayer: new PublicKey(publicKeys![0]) })
    .add(stakeInstruction)
    .add(TransactionInstruction2);
  try {
    const res = await torus?.signTransaction(transaction);
    // debugConsole(res as string);
    // const res = await torus.provider.request({
    //   method: "send_transaction",
    //   params: { message: transaction.serializeMessage().toString("hex") }
    // });
  } catch (e) {
    debugConsole(e as string);
  }
};

const gaslessTransfer = async () => {
  const blockhash = (await conn.getRecentBlockhash("finalized")).blockhash;
  const TransactionInstruction = SystemProgram.transfer({
    fromPubkey: new PublicKey(publicKeys![0]),
    toPubkey: new PublicKey(publicKeys![0]),
    lamports: 0.01 * LAMPORTS_PER_SOL,
  });
  try {
    const res = await torus?.getGaslessPublicKey();
    let transaction = new Transaction({ recentBlockhash: blockhash, feePayer: new PublicKey(res || "") }).add(TransactionInstruction);
    const res_tx = await torus?.sendTransaction(transaction);

    debugConsole(res_tx as string);
  } catch (e) {
    debugConsole(e as string);
  }
};

const signTransaction = async () => {
  const blockhash = (await conn.getRecentBlockhash("finalized")).blockhash;
  const TransactionInstruction = SystemProgram.transfer({
    fromPubkey: new PublicKey(publicKeys![0]),
    toPubkey: new PublicKey(publicKeys![0]),
    lamports: 0.01 * LAMPORTS_PER_SOL,
  });
  let transaction = new Transaction({ recentBlockhash: blockhash, feePayer: new PublicKey(publicKeys![0]) }).add(TransactionInstruction);

  try {
    const res = await torus?.signTransaction(transaction);
    debugConsole(JSON.stringify(res));
    // const res = await torus.provider.request({
    //   method: "sign_transaction",
    //   params: { message: transaction.serializeMessage().toString("hex") }
    // });
    // const msg = Buffer.from(res, "hex");
    // const tx = Transaction.from(msg);
    // debugConsole ( JSON.stringify(tx));
  } catch (e) {
    debugConsole(e as string);
  }
};

// MAKE SURE browser allow pop up from this site
const signAllTransaction = async () => {
  function getNewTx() {
    let inst = SystemProgram.transfer({
      fromPubkey: new PublicKey(publicKeys![0]),
      toPubkey: new PublicKey(publicKeys![0]),
      lamports: 0.1 * Math.random() * LAMPORTS_PER_SOL,
    });
    return new Transaction({ recentBlockhash: blockhash, feePayer: new PublicKey(publicKeys![0]) }).add(inst);
  }

  const blockhash = (await conn.getRecentBlockhash("finalized")).blockhash;
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
  if (showButton.value) {
    await torus?.hideTorusButton();
    showButton.value = false;
  } else {
    await torus?.showTorusButton();
    showButton.value = true;
  }
  debugConsole(`${showButton.value ? "show button" : "hide button"}`);
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
  document.querySelector("#console > p")!.innerHTML = typeof text === "object" ? JSON.stringify(text) : text;
};
</script>

<template>
  <div id="app">
    <p class="font-italic">Note: This is a testing application. Please open console for debugging.</p>
    <div :style="{ marginTop: '20px' }">
      <h4 class="break-word">Login and resets</h4>
      <p class="break-word">
        Build Environment :
        <i>{{ buildEnv }}</i>
      </p>
      <p v-if="network" class="break-word">Solana Network : {{ network }}</p>
      <p v-if="pubkey" class="break-word">Publickey : {{ pubkey }}</p>
      <div v-if="pubkey === ''">
        <select name="buildEnv" v-model="buildEnv">
          <option value="production">Production</option>
          <option value="testing">Testing</option>
          <option value="development">Development</option>
        </select>
        <button @click="login">Login</button>
      </div>
      <button @click="plogin">phantom connect</button>
      <button @click="pSPLTransfer">phantom send</button>
      <!-- <button v-if="!pubkey" @click="login">Login</button> -->
      <button v-if="pubkey" @click="logout">Logout</button>
      <div v-if="pubkey">
        <h4>Torus Specific API</h4>
        <button @click="getUserInfo">Get UserInfo</button>
        <button @click="changeProvider">Change Provider</button>
        <button @click="toggleButton">Toggle Show</button>
        <button @click="topup">Top Up</button>
        <h4>Blockchain Specific API</h4>
        <button @click="transfer">Send Transaction</button>
        <button @click="transferSPL">Send SPL Transaction</button>
        <!-- <button @click="gaslessTransfer">Send Gasless Transaction</button> -->
        <button @click="signTransaction">Sign Transaction</button>
        <button @click="signAllTransaction">Sign All Transactions</button>
        <button @click="sendMultipleInstructionTransaction">Multiple Instruction tx</button>
        <button @click="signMessage">Sign Message</button>
        <button @click="splTransfer">dev spltransfer</button>
      </div>
    </div>
    <div id="console-wrapper">
      <div>Console :</div>
      <div id="console">
        <p></p>
      </div>
    </div>
  </div>
</template>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 2rem;
}
#console-wrapper {
  margin-top: auto;
}

#console {
  border: 1px solid black;
  height: 80px;
  padding: 2px;
  position: relative;
  text-align: left;
  width: 100%;
  border-radius: 5px;
  overflow: scroll;
}

#console > p {
  margin: 0.5em;
  word-wrap: break-word;
}
#font-italic {
  font-style: italic;
}
button {
  margin: 0 10px 10px 0;
}

h3 {
  margin: 40px 0 0;
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
</style>
