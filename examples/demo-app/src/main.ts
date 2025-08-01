import "./global";
import "./style.css";

import { createIcons } from "@toruslabs/vue-components";
import { createApp } from "vue";

import App from "./App.vue";
import icons from "./icons";

const app = createApp(App);

app.use(createIcons(icons)).mount("#app");
