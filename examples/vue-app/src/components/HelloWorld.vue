<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram,Message, Transaction, Keypair } from "@solana/web3.js";
import Torus from "@toruslabs/solana-embed";
import { SUPPORTED_NETWORKS, CHAINS } from "../assets/const";
import nacl from "tweetnacl";
import log from "loglevel";


let torus: Torus;
const rpcTarget : string ="https://spring-frosty-sky.solana-testnet.quiknode.pro/060ad86235dea9b678fc3e189e9d4026ac876ad4/" ;
const conn = new Connection(rpcTarget);
let publicKeys: string[] | undefined;
const pubkey = ref("");

onMounted(async () => {
  torus = new Torus();
  // console.log("onMounted");
  await torus.init({
    buildEnv: "development",
    showTorusButton: true,
    network: {
      blockExplorerUrl: "?cluster=testnet",
      chainId: "0x2",
      displayName: "Solana Testnet",
      logo: "solana.svg",
      rpcTarget: rpcTarget,
      ticker: "SOL",
      tickerName: "Solana Token",
    }
  });
});

const login = async () => {
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
    lamports: 0.1 * LAMPORTS_PER_SOL
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
    debugConsole(e as string );
  }
};

const signTransaction = async () => {
  const blockhash = (await conn.getRecentBlockhash("finalized")).blockhash;
  const TransactionInstruction = SystemProgram.transfer({
    fromPubkey: new PublicKey(publicKeys![0]),
    toPubkey: new PublicKey(publicKeys![0]),
    lamports: 0.1 * LAMPORTS_PER_SOL
  });
  let transaction = new Transaction({ recentBlockhash: blockhash, feePayer: new PublicKey(publicKeys![0]) }).add(TransactionInstruction);

  try {
    const res = await torus.signTransaction(transaction)
    debugConsole(JSON.stringify(res) )
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

const signMessage = async () => {
  try {
    let msg = Buffer.from("Test Signing Message ", "utf8");
    const res = await torus.signMessage(msg);
    nacl.sign.detached.verify( msg, res, new PublicKey( publicKeys![0] ).toBytes() ) ;
    debugConsole(JSON.stringify(res));
  } catch (e) {
    log.error(e);
    debugConsole(JSON.stringify(e));
  }
};

const changeProvider = async () => {
  const providerRes = await torus?.setProvider(SUPPORTED_NETWORKS[CHAINS.SOLANA_MAINNET]);
  // uiConsole("provider res", providerRes)
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
      <button v-if="!pubkey" @click="login">Login</button>
      <button v-if="pubkey" @click="logout">Logout</button>
      <div v-if="pubkey">Publickey : {{ pubkey }}</div>
      <div v-if="pubkey"> 
        <!-- <h4>Torus Specific API</h4>
        <button @click="changeProvider">Change Provider</button> -->
        <h4>Blockchain Specific API</h4>
        <button @click="transfer">Send Transaction</button>
        <button @click="signTransaction">Sign Transaction</button>
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
