const { ProvidePlugin } = require("webpack");
module.exports = {
  transpileDependencies: true,
  configureWebpack: {
    devtool: "source-map",
  },
  // lintOnSave: false,
  devServer: {
    port: 3000
  },
  configureWebpack: (config) => {
    config.resolve.fallback = {
      stream: require.resolve("stream-browserify"),
    };
    config.plugins.push(new ProvidePlugin({ Buffer: ["buffer", "Buffer"] }));
    config.plugins.push(new ProvidePlugin({ process: ["process/browser"] }));
  },
};
