<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram,Message, Transaction } from "@solana/web3.js";
import {TorusWalletAdapter } from "../adapter";
import { TorusParams } from "@toruslabs/solana-embed";
import nacl from "tweetnacl";

const rpcTarget =clusterApiUrl("testnet") ;
const conn = new Connection(rpcTarget);
let publicKeys: string[] | undefined;
const pubkey = ref("");
let wallet : TorusWalletAdapter;

onMounted(async () => {
  // console.log("onMounted");

  const config : TorusParams = {
    buildEnv: "development",
    showTorusButton: false,
    network: {
      blockExplorerUrl: "?cluster=testnet",
      chainId: "0x2",
      displayName: "Solana Testnet",
      logo: "solana.svg",
      rpcTarget: rpcTarget,
      ticker: "SOL",
      tickerName: "Solana Token",
    }
  }
  wallet = new TorusWalletAdapter(config)

  // console.log("finished initializing torus", torus);
});

const login = async () => {
  await wallet.connect();
  publicKeys = [wallet.publicKey?.toBase58() || ""];
  pubkey.value = wallet.publicKey?.toBase58() || "";
};

const logout = async () => {
  await wallet.disconnect();
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
    const res = await wallet?.sendTransaction(transaction, conn)
    debugConsole(res);
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
    const res = await wallet.signTransaction(transaction)
    debugConsole(JSON.stringify(res));
  } catch (e) {
    debugConsole(e as string);
  }
};

const signMessage = async () => {
  try {
    const msg = Buffer.from("Testing Signing Message", "utf8")
    const res = await wallet.signMessage(msg)
    nacl.sign.detached.verify( msg, res, new PublicKey( publicKeys![0] ).toBytes() ) ;
    debugConsole(JSON.stringify(res));
  } catch (e) {
    debugConsole(e as string);
  }
};

const debugConsole = async (text: string) => {
  document.querySelector("#console > p")!.innerHTML = typeof text === "object" ? JSON.stringify(text) : text;
};
</script>

<template>
  <div id="app">
    <p class="font-italic">Note: This is a testing application for Torus Solana Wallet Adapter. Please open console for debugging.</p>
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
    <!-- <div id="console">
      <p></p>
    </div> -->
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
