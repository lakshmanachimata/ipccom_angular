const path = require('path');
const nodeExternals = require('webpack-node-externals');
const uglifyIt = require("uglifyjs-webpack-plugin");
module.exports = {
  entry : './app.ts',
  output : {
    path : path.resolve(__dirname, 'bin'),
    filename : 'app.js'
  },
  module: {
    rules : [{
      test:/\.ts$/,
      use:'ts-loader'
    }]
  },
  target : 'node',
  node : {
    __dirname : false,
    __filename : false
  },
  resolve : {
    extensions : ['.ts' , '.js']
  },
  mode : 'production',
  // externals : [nodeExternals()],
  // devtool : 'cheap-module-source-mape',
  // plugins : [new uglifyIt()]
}
