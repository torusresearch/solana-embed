/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");
const ESLintPlugin = require("eslint-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

const pkg = require("./package.json");

const pkgName = "torus";
const libraryName = pkgName.charAt(0).toUpperCase() + pkgName.slice(1);

const { NODE_ENV = "production" } = process.env;
const depsList = Object.keys(pkg.dependencies);

const baseConfig = {
  mode: NODE_ENV,
  devtool: "source-map",
  entry: "./src/index.ts",
  target: "web",
  output: {
    path: path.resolve(__dirname, "dist"),
    library: libraryName,
    libraryExport: "default",
  },
  resolve: {
    extensions: [".ts", ".js", ".json"],
    alias: {
      "bn.js": path.resolve(__dirname, "node_modules/bn.js"),
      // lodash: path.resolve(__dirname, "node_modules/lodash-es"),
      "js-sha3": path.resolve(__dirname, "node_modules/js-sha3"),
    },
  },
  module: {
    rules: [],
  },
};

const babelLoaderWithPolyfills = {
  test: /\.(ts|js)x?$/,
  exclude: /(node_modules|bower_components)/,
  use: {
    loader: "babel-loader",
  },
};

const babelLoader = { ...babelLoaderWithPolyfills, use: { loader: "babel-loader", options: { plugins: ["@babel/transform-runtime"] } } };

const umdConfig = {
  ...baseConfig,
  output: {
    ...baseConfig.output,
    filename: `${pkgName}.umd.min.js`,
    libraryTarget: "umd",
  },
  module: {
    rules: [babelLoader],
  },
};

const cjsConfig = {
  ...baseConfig,
  // optimization: {
  //   minimize: false,
  // },
  output: {
    ...baseConfig.output,
    filename: `${pkgName}.cjs.js`,
    libraryTarget: "commonjs2",
  },
  module: {
    rules: [babelLoader],
  },
  externals: [...depsList, /^(@babel\/runtime)/i],
  plugins: [
    new ESLintPlugin({
      files: "src",
      extensions: ".ts",
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: "static", // disabled static
      openAnalyzer: false,
    }),
  ],
};

module.exports = [umdConfig, cjsConfig];
// module.exports = [cjsConfig]

// V5
// experiments: {
//   outputModule: true
// }

// node: {
//   global: true,
// },
// resolve: {
//   alias: { crypto: 'crypto-browserify', stream: 'stream-browserify', vm: 'vm-browserify' },
//   aliasFields: ['browser'],
// },
