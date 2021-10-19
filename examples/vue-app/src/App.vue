<template>
  <HelloWorld />
  <WalletTest />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import HelloWorld from './components/HelloWorld.vue';
import WalletTest from './components/WalletTest.vue';

export default defineComponent({
  name: 'App',
  components: {
    HelloWorld,
    WalletTest,
  }
});
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
