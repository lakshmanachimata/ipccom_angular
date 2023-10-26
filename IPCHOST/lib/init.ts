import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os'; // See: https://www.npmjs.com/package/os
import { Logger, loggerFactory } from '../src/ipc-logger';
import { cliExecuteCommand, cliArgs } from './cli';
const IPCCLILOGGERFILE = 'ETP-IPCCLI-Logger';
const cwd = process.env.ipcCWD || process.cwd()
const ipcConfig = JSON.parse(fs.readFileSync(path.resolve(cwd,'../configuration/ipc.json'), 'utf-8'))

if(!ipcConfig) {
  console.error('ETP IPC Host confiuration missing. Unable to start')
  process.exit(1)
}

const homeDir = os.homedir()
const desktopDir = `${homeDir}/Desktop`;


ipcConfig.loggerProviderProperties.filePath = ipcConfig.loggerProviderProperties.filePath? ipcConfig.loggerProviderProperties.filePath : desktopDir

const ipcLogger : Logger = loggerFactory(ipcConfig)
ipcLogger.info("Desktop directory path is " + desktopDir)
const args = process.argv.slice(2)
if( !args || args.length == 0) {
  ipcLogger.info('IPC Cli is invoked without any parameters. It is going to run with start as default command')
}
const cmdArgs: cliArgs = {command: args[0]  ? args[0] : 'start' };

ipcLogger.info(`invoking cliExecuteCommand with ${cmdArgs.command}`)

cliExecuteCommand(cmdArgs,ipcLogger).then((code: number | void ) => {
  ipcLogger.info(`cliExecuteCommand completed with return code : ${code}`)
}).catch((err: Error)  => {
  ipcLogger.info(`cliExecuteCommand completed with error : ${err.toString()}`)
  process.exit();
})

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
