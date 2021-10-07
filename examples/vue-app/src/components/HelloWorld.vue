<script lang="ts" setup>
import { onMounted } from "vue";
import Torus from "@toruslabs/casper-embed";

onMounted(async () => {
  const torus = new Torus();
  await torus.init({
    buildEnv: "development",
    showTorusButton: true,
  });
  // torus.login();
});
</script>

<template>
  <div class="hello">
    <button>Login</button>
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
