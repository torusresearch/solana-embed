<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import base58 from "bs58";
import Torus from "@toruslabs/solana-embed";
let torus = null;

const conn = new Connection(clusterApiUrl("testnet"));
let publicKeys = [];

export default {
  name: "solana-embed-demo",
  data() {
    return {
      publicKey: ""
    };
  },
  computed: {},
  methods: {
    async login() {
      console.log("login click");
      publicKeys = await torus?.login({});
      pubkey.value = pk[0];

      console.log("publicKeys", publicKeys);
    },
    async transfer() {
      const blockhash = (await conn.getRecentBlockhash("finalized")).blockhash;
      // const transactionFee = ((await conn.getFeeCalculatorForBlockhash(blockhash)).value?.lamportsPerSignature || 0) / LAMPORTS;

      const TransactionInstruction = SystemProgram.transfer({
        fromPubkey: new PublicKey(publicKeys[0]),
        toPubkey: new PublicKey(publicKeys[0]),
        lamports: 0.1 * LAMPORTS_PER_SOL
      });
      let transaction = new Transaction({ recentBlockhash: blockhash, feePayer: new PublicKey(publicKeys[0]) }).add(TransactionInstruction);
      console.log(transaction);

      const res = await torus.provider.request({
        method: "send_transaction",
        params: { message: transaction.serializeMessage().toString("hex") }
      });
      console.log(res);
    },
    console(text) {
      document.querySelector("#console>p").innerHTML = typeof text === "object" ? JSON.stringify(text) : text;
    }
  },
  async mounted() {
    torus = new Torus();
    console.log("onMounted");
    await torus.init({
      buildEnv: "development",
      showTorusButton: true
    });
    console.log("finished initializing torus", torus);
    // torus.login();
  }
};
</script>

<template>
  <div id="app">
    <p class="font-italic">Note: This is a testing application. Please open console for debugging.</p>

    <div class="hello">
      <div v-if="pubkey">Publickey : {{ pubkey }}</div>
      <button @click="login">Login</button>
      <button @click="transfer">Transfer</button>
    </div>

    <div id="console">
      <p></p>
    </div>
  </div>
</template>

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
  padding: 2px;
  bottom: 10px;
  position: absolute;
  text-align: left;
  width: calc(100% - 20px);
  border-radius: 5px;
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
