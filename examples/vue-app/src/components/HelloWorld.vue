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
let pk : string[] | undefined;
const login = async() => {
  console.log('login click');
  pk = await torus?.login({});
  console.log(pk)
}

const transfer = async () => {
  
  const conn = new Connection(clusterApiUrl("testnet"));
  const blockhash = (await conn.getRecentBlockhash("finalized")).blockhash;
  // const transactionFee = ((await conn.getFeeCalculatorForBlockhash(blockhash)).value?.lamportsPerSignature || 0) / LAMPORTS;

  const ti = SystemProgram.transfer({
      fromPubkey: new PublicKey(pk![0]),
      toPubkey: new PublicKey(pk![0]),
      lamports: 0.1 * LAMPORTS_PER_SOL,
    });
  let tf = new Transaction({ recentBlockhash: blockhash, feePayer: new PublicKey(pk![0]) }).add(ti);
  console.log(tf)
  const res = await torus!.provider.request({
    method : "send_transaction",
    params : { message : base58.encode(tf.serializeMessage() )}
  })
  // torus.sendTrasaction
  // const res = await torus!
  console.log(res)
}
</script>

<template>
  <div class="hello">
    <button @click="login">Login</button>
    <button @click="transfer">Transfer</button>
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
