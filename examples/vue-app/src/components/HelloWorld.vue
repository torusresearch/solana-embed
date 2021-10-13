<script lang="ts" setup>
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
onMounted(async () => {
  torus = new Torus();
  await torus.init({
    buildEnv: "development",
    showTorusButton: true,
  });
  console.log("finished initializing torus", torus);
  // torus.login();
});

const login = async () => {
  const loginaccs = await torus?.login();
  account.value = (loginaccs || [])[0] || ""
}

const changeProvider = async () => {
  const providerRes = await torus?.setProvider(SUPPORTED_NETWORKS[CHAINS.CASPER_MAINNET]);
  console.log("provider res", providerRes)
}
</script>

<template>
  <div class="hello" v-if="!account">
    <button @click="login">Login</button>
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
