<script lang="ts" setup>
import { onMounted } from "vue";
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import base58 from "bs58";
import Torus from "@toruslabs/solana-embed";
let torus: Torus | null = null;

onMounted(async () => {
  torus = new Torus();
  console.log('onMounted')
  await torus.init({
    buildEnv: "development",
    showTorusButton: true,
  });
  console.log("finished initializing torus", torus);
  // torus.login();
});

let publicKeys : string[] | undefined;
const login = async() => {
  console.log('login click');
  publicKeys = await torus?.login({});
  console.log("publicKeys", publicKeys)
}

const transfer = async () => {
  
  const conn = new Connection(clusterApiUrl("testnet"));
  const blockhash = (await conn.getRecentBlockhash("finalized")).blockhash;
  // const transactionFee = ((await conn.getFeeCalculatorForBlockhash(blockhash)).value?.lamportsPerSignature || 0) / LAMPORTS;

  const TransactionInstruction = SystemProgram.transfer({
      fromPubkey: new PublicKey(publicKeys![0]),
      toPubkey: new PublicKey(publicKeys![0]),
      lamports: 0.1 * LAMPORTS_PER_SOL,
    });
  let transaction = new Transaction({ recentBlockhash: blockhash, feePayer: new PublicKey(publicKeys![0]) }).add(TransactionInstruction);
  console.log(transaction)
  const res = await torus!.provider.request({
    method : "send_transaction",
    params : { message : transaction.serializeMessage().toString("hex")}
  })
  // torus.sendTrasaction
  // const res = await torus!
}
</script>

<template>
  <div class="hello" v-if="!account">
    <button @click="login">Login</button>
    <button @click="transfer">Transfer</button>
  </div>
  <div class="hello" v-else>
    Logged in with {{ account }}
    <button @click="changeProvider">Change Provider</button>
  </div>
</template>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
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
