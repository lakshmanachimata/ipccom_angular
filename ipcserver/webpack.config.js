const path = require("path")
const nodeExternals = require("webpack-node-externals")
const uglify = require("uglifyjs-webpack-plugin")
module.exports = {
  entry : './bin/ipc.ts',
  output : {
    path : path.resolve(__dirname, 'ipcserver/bin'),
    filename : 'ipc.js'
  },
  module: {

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
  externals : [nodeExternals()],
  devtool : 'cheap-module-source-mape',
  plugins : [new uglify()]
}
