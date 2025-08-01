<script setup>
import { computed, onBeforeMount, ref } from 'vue';
import SolanaEmbed, {  WS_EMBED_BUILD_ENV } from '@toruslabs/solana-embed';
import { Icon } from '@toruslabs/vue-components/Icon';
import { Loader } from '@toruslabs/vue-components/Loader';
import Button from "./Button";
import Solana from "./Solana.vue";

defineProps({
  msg: String,
});

let solanaEmbed = undefined;

const isLoading = ref(false);
const selectedBuildEnv = ref(WS_EMBED_BUILD_ENV.PRODUCTION);
const account = ref("");
const chainId = ref("0x65");
const preferredChainConfig = ref(null);
const isCopied = ref(false);

const formattedAccountAddress = computed(() => {
  return `${account.value.substring(0, 5)}...${account.value.substring(account.value.length - 6)}`;
});

onBeforeMount(async () => {
  try {
    isLoading.value = true;
    solanaEmbed = new SolanaEmbed();

    const solanaEmbedBuildEnv = sessionStorage.getItem("solana_embed_build_env");
    if (solanaEmbedBuildEnv) {
      selectedBuildEnv.value = solanaEmbedBuildEnv;
      await initializeSolanaEmbed();
    }
  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
  }
});

const setPreferredChainConfig = async () => {
  preferredChainConfig.value = await solanaEmbed?.provider.request({
    method: "solana_provider_config",
  });
};

const initializeSolanaEmbed = async () => {
  if (solanaEmbed?.isInitialized) {
    if (selectedBuildEnv.value !== solanaEmbed.getBuildEnv) await solanaEmbed?.cleanUp();
    else return;
  }

  await solanaEmbed?.init({
    buildEnv: selectedBuildEnv.value,
    confirmationStrategy: "default",
  });

  await setPreferredChainConfig();

  // Update provider on accountsChanged
  solanaEmbed?.provider.on("accountsChanged", async (accounts) => {
    console.log("check: accountsChanged", accounts);
    if (account.value.length > 0 && accounts.length === 0) {
      account.value = "";
      isLoading.value = false;
      return;
    }
    if (accounts.length > 0) {
      login();
    }
  });

  solanaEmbed?.provider.on("chainChanged", async (chain) => {
    console.log("check: chainChanged", chain);
    chainId.value = chain;
    await setPreferredChainConfig();
  });
};

const login = async () => {
  try {
    console.log(">>> login");
    isLoading.value = true;
    await initializeSolanaEmbed();
    // Note: can pass authConnection and login_hint as params if you want to preselect a provider and login identifier eg. email
    // const loginaccs = await torus?.login({ authConnection: "google", login_hint: "sample@gmail.com" });

    // Passing empty will trigger showing the login modal showing all login provider options
    const loginaccs = await solanaEmbed?.login();
    console.log("loginaccs", loginaccs);
    account.value = (loginaccs || [])[0] || "";
    isLoading.value = false;

    // getCurrentChain();

    sessionStorage.setItem("solana_embed_build_env", selectedBuildEnv.value);
  } catch (error) {
    console.error(error);
    isLoading.value = false;
  }
};

const logout = async () => {
  try {
    isLoading.value = true;
    await solanaEmbed?.logout();
    account.value = "";
    sessionStorage.removeItem("solana_embed_build_env");
    // sessionStorage.removeItem("ws_embed_chain_namespace");
  } catch (error) {
    console.error(error);
    // uiConsole("Logout Error", error);
  } finally {
    isLoading.value = false;
  }
};

const copyAccountAddress = () => {
  navigator.clipboard.writeText(account.value);
  isCopied.value = true;
  setTimeout(() => {
    isCopied.value = false;
  }, 1000);
};

const clearConsole = () => {
  const el = document.querySelector("#console>pre");
  const h1 = document.querySelector("#console>h1");
  const consoleBtn = document.querySelector<HTMLElement>("#console>div.clear-console-btn");
  if (h1) {
    h1.innerHTML = "";
  }
  if (el) {
    el.innerHTML = "";
  }
  if (consoleBtn) {
    consoleBtn.style.display = "none";
  }
};

</script>

<template>
  <!-- Loader -->
  <div v-if="isLoading" class="loader-container">
    <Loader :use-spinner="true" :classes="{ spinnerMask: '!bg-transparent' }" />
  </div>
  <!-- Login -->
  <div v-else-if="!account" class="login-container">
    <h1 class="login-heading">Demo</h1>

    <div>
      <div class="select-label">Build Environment</div>
      <select v-model="selectedBuildEnv" class="select">
        <option v-for="login in Object.values(WS_EMBED_BUILD_ENV)" :key="login" :value="login">{{ login }}</option>
      </select>
    </div>

    <div class="login-btn">
      <Button variant="primary" @on-click="login">Login</Button>
    </div>
    <!-- <div class="sessionId-input">
      <TextField v-model="sessionId" placeholder="Enter Session Id..." />
      <Button @on-click="loginWithSessionId">Login with Session Id</Button>
    </div> -->
  </div>
  <div v-else class="dashboard-container">
    <!-- Dashboard Header -->
    <div class="dashboard-header">
      <div class="heading-mb">
        <h1 class="dashboard-heading">Demo</h1>
        <p class="dashboard-subheading">Build Environment : {{ selectedBuildEnv }}</p>
      </div>
      <div class="dashboard-action-container">
        <div class="header-mb">
          <!-- <Button variant="tertiary" small class="network" classes="flex gap-1 items-center">
            <Icon name="wifi-solid-icon" size="16" />
            <p class="text-xs">{{ currentNetwork }}</p>
          </Button> -->
          <Button variant="tertiary" classes="flex gap-2 w-fit !text-xs" class="!w-auto" small :title="account" @click.stop="copyAccountAddress">
            <Icon v-if="isCopied" name="check-circle-solid-icon" size="16" />
            <Icon v-else name="document-duplicate-solid-icon" size="16" />
            <p class="text-xs">{{ formattedAccountAddress }}</p>
          </Button>
          <Button variant="secondary" classes="flex gap-1 !text-xs" class="!w-auto" small @click.stop="logout">
            <!-- <img class="logout-img" :src="require('@/assets/logout.svg')" alt="logout" height="14" width="14" /> -->
            <p class="text-xs">Logout</p>
          </Button>
        </div>
      </div>
    </div>
    <div class="dashboard-details-container">
      <!-- Dashboard Console Container -->
       <div class="dashboard-details-btn-container">
        <div class="details-container">
          <Solana :ws-embed="solanaEmbed" :account="account" :preferred-chain-config="preferredChainConfig" :chain-id="chainId" />
        </div>
       </div>
      <div id="console" class="dashboard-details-console-container">
        <h1 class="console-heading"></h1>
        <pre class="console-container"></pre>
        <div class="clear-console-btn">
          <Button :pill="false" :block="false" small @on-click="clearConsole">Clear console</Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import "./dashboard.css";
</style>
