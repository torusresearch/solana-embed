<script lang="ts" setup>
<<<<<<< HEAD
import { onMounted, ref } from "vue";
import Torus from "@toruslabs/casper-embed";

const CHAINS = {
  CASPER_MAINNET: "casper",
  CASPER_TESTNET: "casper-test",
};

const CHAIN_ID_NETWORK_MAP = {
  "0x1": CHAINS.CASPER_MAINNET,
  "0x2": CHAINS.CASPER_TESTNET,
};

const SUPPORTED_NETWORKS = {
  [CHAINS.CASPER_MAINNET]: {
    blockExplorerUrl: "https://cspr.live",
    chainId: "0x1",
    displayName: "Casper Mainnet",
    logo: "https://cspr.live/assets/icons/logos/cspr-live-full.svg",
    rpcTarget: "https://casper-node.tor.us",
    ticker: "CSPR",
    tickerName: "Casper Token",
    networkKey: CHAINS.CASPER_MAINNET,
  },
  [CHAINS.CASPER_TESTNET]: {
    blockExplorerUrl: "https://testnet.cspr.live",
    chainId: "0x2",
    displayName: "Casper Testnet",
    logo: "https://testnet.cspr.live/assets/icons/logos/cspr-live-full.svg",
    rpcTarget: "https://testnet.casper-node.tor.us",
    ticker: "CSPR",
    tickerName: "Casper Token",
    networkKey: CHAINS.CASPER_TESTNET,
  },
};

let torus: Torus | null = null;
const account = ref<string>("");
=======
import { onMounted } from "vue";
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import base58 from "bs58";
import Torus from "@toruslabs/solana-embed";
let torus: Torus | null = null;

>>>>>>> ea70574 (update example)
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

<<<<<<< HEAD
const login = async () => {
  const loginaccs = await torus?.login();
  account.value = (loginaccs || [])[0] || ""
}

const changeProvider = async () => {
  const providerRes = await torus?.setProvider(SUPPORTED_NETWORKS[CHAINS.CASPER_MAINNET]);
  console.log("provider res", providerRes)
=======
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
>>>>>>> ea70574 (update example)
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
