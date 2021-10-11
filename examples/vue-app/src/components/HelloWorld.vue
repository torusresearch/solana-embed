<script lang="ts" setup>
import { onMounted, ref } from "vue";
import Torus from "@toruslabs/casper-embed";
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
</script>

<template>
  <div class="hello" v-if="!account">
    <button @click="login">Login</button>
  </div>
  <div class="hello" v-else>
    Logged in with {{ account }}
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
