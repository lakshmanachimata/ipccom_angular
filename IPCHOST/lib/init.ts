import * as fs from 'fs';
import * as path from 'path';
import { Logger, loggerFactory } from '../src/ipc-logger';
const IPCCLILOGGERFILE = 'ETP-IPCCLI-Logger';
const cwd = process.env.ipcCWD || process.cwd()
const ipcConfig = JSON.parse(fs.readFileSync(path.resolve(cwd,'../configuration/ipc.json'), 'utf-8'))

if(!ipcConfig) {
  console.error('ETP IPC Host confiuration missing. Unable to start')
  process.exit(1)
}

const ipcLogger : Logger = loggerFactory(ipcConfig)
const args = process.argv.slice(2)
if( !args || args.length == 0) {
  ipcLogger.info('IPC Cli is invoked without any parameters. It is going to run with start as default command')
}
// const cmdArgs: cliArgs


process.on('exit', function() {

})

process.on('uncaughtException', (e) => {
  ipcLogger.error({message : "IPCHost is exiting. Uncaught Exception : " + e.message, cb: ()=> {
    process.exit();
  }})
})

process.on('SIGINT',() => {
  ipcLogger.error({message : "ETP_IPCHost is exiting", cb: ()=> {
    process.exit();
  }})
})

process.on('SIGTERM',() => {
  ipcLogger.error({message : "ETP_IPCHost is exiting", cb: ()=> {
    process.exit();
  }})
})

process.on('SIGHUP',() => {
  ipcLogger.error({message : "ETP_IPCHost is exiting", cb: ()=> {
    process.exit();
  }})
})
