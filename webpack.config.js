const path = require("path");
const webpack = require("webpack");
const CopyWebpackPlugin = require('copy-webpack-plugin');


const ROOT = path.resolve(__dirname, "src");
const DESTINATION = path.resolve(__dirname, "dist");

module.exports = {
  context: ROOT,

  entry: {
    main: "./main.ts"
  },

  output: {
    filename: "[name].bundle.js",
    path: DESTINATION
  },

  resolve: {
    extensions: [".ts", ".js"],
    modules: [ROOT, "node_modules"]
  },

  plugins: [
    new CopyWebpackPlugin([ { from: 'src/assets', to: 'assets' } ])
  ],

  module: {
    rules: [
      /****************
       * PRE-LOADERS
       *****************/
      {
        enforce: "pre",
        test: /\.js$/,
        use: "source-map-loader"
      },
      {
        enforce: "pre",
        test: /\.ts$/,
        exclude: /node_modules/,
        use: "tslint-loader"
    },
    
    /****************
     * LOADERS
     *****************/
    {
        enforce: "pre",
        test: /\.(frag|vert|txt)$/i,
        exclude: [/node_modules/],
        use: "raw-loader"
      },
      {
        test: /\.ts$/,
        exclude: [/node_modules/],
        use: "awesome-typescript-loader"
      }
    ]
  },

  devtool: "cheap-module-source-map",
  devServer: {
  }
};
