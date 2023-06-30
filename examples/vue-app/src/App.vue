<template>
  <Dashboard />
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Dashboard from "./components/Dashboard";

export default defineComponent({
  name: "App",
  components: {
    Dashboard,
  },
});
</script>

<style>
html,
body,
* {
  padding: 0;
  margin: 0;
  font-family: "Poppins", sans-serif !important;
}
</style>
