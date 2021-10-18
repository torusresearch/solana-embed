<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import Torus, { TORUS_BUILD_ENV_TYPE } from "@toruslabs/solana-embed";
import { SUPPORTED_NETWORKS, CHAINS } from "../assets/const";
import nacl from "tweetnacl";
import log from "loglevel";


let torus: Torus;
let conn: Connection;
let publicKeys: string[] | undefined;
const network = ref("");
const pubkey = ref("");
const buildEnv = ref<TORUS_BUILD_ENV_TYPE>("testing");
const showButton = ref(false);

const login = async () => {
  torus = new Torus();
  (window as any).torus = torus;
  // torus.cleanUp();

  await torus.init({
    buildEnv: buildEnv.value,
    showTorusButton: showButton.value,
    network: {
      blockExplorerUrl: "?cluster=testnet",
      chainId: "0x2",
      displayName: "Solana Testnet",
      logo: "solana.svg",
      rpcTarget: clusterApiUrl("testnet"),
      ticker: "SOL",
      tickerName: "Solana Token"
    }
  });
  const target_network = await torus.provider.request({
    method: "solana_provider_config",
    params: []
  }) as { rpcTarget: string, displayName: string }
  console.log(target_network)
  network.value = target_network.displayName
  conn = new Connection(target_network?.rpcTarget)

  publicKeys = await torus?.login({});
  pubkey.value = publicKeys ? publicKeys[0] : "";
};

const logout = async () => {
  torus.logout();
  pubkey.value = "";
};

const transfer = async () => {
  const blockhash = (await conn.getRecentBlockhash("finalized")).blockhash;
  const TransactionInstruction = SystemProgram.transfer({
    fromPubkey: new PublicKey(publicKeys![0]),
    toPubkey: new PublicKey(publicKeys![0]),
    lamports: 0.01 * LAMPORTS_PER_SOL
  });
  let transaction = new Transaction({ recentBlockhash: blockhash, feePayer: new PublicKey(publicKeys![0]) }).add(TransactionInstruction);
  try {
    const res = await torus?.sendTransaction(transaction)
    debugConsole(res);
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
    lamports: 0.01 * LAMPORTS_PER_SOL
  });
  try {
    const res = await torus?.getGaslessPublicKey();
    let transaction = new Transaction({ recentBlockhash: blockhash, feePayer: new PublicKey(res) }).add(TransactionInstruction);
    const res_tx = await torus.sendTransaction(transaction);

    debugConsole(res_tx);
  } catch (e) {
    log.error(e);
    debugConsole(JSON.stringify(e));
  }
};

const signTransaction = async () => {
  const blockhash = (await conn.getRecentBlockhash("finalized")).blockhash;
  const TransactionInstruction = SystemProgram.transfer({
    fromPubkey: new PublicKey(publicKeys![0]),
    toPubkey: new PublicKey(publicKeys![0]),
    lamports: 0.01 * LAMPORTS_PER_SOL
  });
  let transaction = new Transaction({ recentBlockhash: blockhash, feePayer: new PublicKey(publicKeys![0]) }).add(TransactionInstruction);

  try {
    const res = await torus.signTransaction(transaction)
    debugConsole(JSON.stringify(res))
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
  const blockhash = (await conn.getRecentBlockhash("finalized")).blockhash;
  const TransactionInstruction = SystemProgram.transfer({
    fromPubkey: new PublicKey(publicKeys![0]),
    toPubkey: new PublicKey(publicKeys![0]),
    lamports: 0.1 * LAMPORTS_PER_SOL
  });
  try {
    const gasless_pk = await torus?.getGaslessPublicKey();
    let transaction = new Transaction({ recentBlockhash: blockhash, feePayer: new PublicKey(publicKeys![0]) }).add(TransactionInstruction);
    let transaction2 = new Transaction({ recentBlockhash: blockhash, feePayer: new PublicKey(gasless_pk) }).add(TransactionInstruction);

    const res = await torus.signAllTransactions([transaction2, transaction])
    debugConsole(JSON.stringify(res))
  } catch (e) {
    debugConsole(e as string);
  }
};

const signMessage = async () => {
  try {
    let msg = Buffer.from("Test Signing Message ", "utf8");
    const res = await torus.signMessage(msg);
    nacl.sign.detached.verify(msg, res, new PublicKey(publicKeys![0]).toBytes());
    debugConsole(JSON.stringify(res));
  } catch (e) {
    log.error(e);
    debugConsole(JSON.stringify(e));
  }
};

const changeProvider = async () => {
  const toNetwork = network.value === SUPPORTED_NETWORKS["mainnet"].displayName ? "testnet" : "mainnet"
  const providerRes = await torus?.setProvider(SUPPORTED_NETWORKS[toNetwork]);
  network.value = SUPPORTED_NETWORKS[toNetwork].displayName
  conn = new Connection(SUPPORTED_NETWORKS[toNetwork].rpcTarget);
};

const getUserInfo = async () => {
  const info = await torus.getUserInfo();
  debugConsole(JSON.stringify(info));
}

const toggleButton = async () => {
  if (showButton.value) {
    await torus.hideTorusButton();
    showButton.value = false;
  } else {
    await torus.showTorusButton();
    showButton.value = true
  }
  debugConsole(`${showButton.value ? "show button" : "hide button"}`)
}

const topup = async () => {
  try {
    const result = await torus.initiateTopup("rampnetwork", {
      selectedAddress: "3zLbFcrLPYk1hSdXdy1jcBRpeeXrhC47iCSjdwqsUaf9"
    })
    if (result) debugConsole("Top Up Successful")
  } catch {
    debugConsole("Top Up Failed")
  }

}

const debugConsole = async (text: string) => {
  document.querySelector("#console > p")!.innerHTML = typeof text === "object" ? JSON.stringify(text) : text;
};
</script>

<template>
  <div id="app">
    <p class="font-italic">Note: This is a testing application. Please open console for debugging.</p>
    <div :style="{ marginTop: '20px' }">
      <h4>Login and resets</h4>
      <p>
        Build Environment :
        <i>{{ buildEnv }}</i>
      </p>
      <p v-if="network">Solana Network : {{ network }}</p>
      <p v-if="pubkey">Publickey : {{ pubkey }}</p>
      <div v-if="pubkey === ''">
        <select name="buildEnv" v-model="buildEnv">
          <option selected value="production">Production</option>
          <option value="testing">Testing</option>
          <option value="development">Development</option>
        </select>
        <button @click="login">Login</button>
      </div>
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
        <button @click="gaslessTransfer">Send Gasless Transaction</button>
        <button @click="signTransaction">Sign Transaction</button>
        <button @click="signAllTransaction">Sign All Transactions</button>
        <button @click="signMessage">Sign Message</button>
      </div>
    </div>
    <div id="console">
      <p></p>
    </div>
  </div>
  <div class="hello"></div>
</template>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
#console {
  border: 1px solid black;
  height: 80px;
  left: 10em;
  padding: 2px;
  bottom: 10px;
  position: absolute;
  text-align: left;
  width: calc(100% - 20px - 10em);
  border-radius: 5px;
  overflow: scroll;
}
#console::before {
  content: "Console :";
  position: absolute;
  top: -20px;
  font-size: 12px;
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
</style>
