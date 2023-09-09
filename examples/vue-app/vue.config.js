const path = require("path");
const { ProvidePlugin } = require("webpack");

module.exports = {
  transpileDependencies: false,
  parallel: !process.env.CI,
  devServer: {
    port: 3000,
  },
  configureWebpack: (config) => {
    config.resolve.fallback = {
      crypto: false,
      stream: false,
      assert: false,
      os: false,
      http: false,
      https: false,
      zlib: false,
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      "bn.js": path.resolve(__dirname, "node_modules/bn.js"),
      lodash: path.resolve(__dirname, "node_modules/lodash"),
    };
    config.plugins.push(new ProvidePlugin({ Buffer: ["buffer", "Buffer"] }));
    config.plugins.push(new ProvidePlugin({ process: ["process/browser"] }));
  },
};
