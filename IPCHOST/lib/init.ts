import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os'; // See: https://www.npmjs.com/package/os
import * as http from 'http'

import { Logger, loggerFactory } from '../src/ipc-logger';
import { cliExecuteCommand, cliArgs } from './cli';
import { ProviderLoaderFactory } from '../src/ipc-provider';
import { ProviderValidator } from './../src/ipc-provider';
const IPCCLILOGGERFILE = 'ETP-IPCCLI-Logger';
const cwd = process.env.ipcCWD || process.cwd()
const ipcConfig = JSON.parse(fs.readFileSync(path.resolve(cwd,'../configuration/ipc.json'), 'utf-8'))
const homeDir = os.homedir()
const desktopDir = `${homeDir}/Desktop`;
const ipcLogger : Logger = loggerFactory(ipcConfig)

if(!ipcConfig) {
  console.error('ETP IPC Host confiuration missing. Unable to start')
  process.exit(1)
}



ipcConfig.loggerProviderProperties.filePath = ipcConfig.loggerProviderProperties.filePath? ipcConfig.loggerProviderProperties.filePath : desktopDir

ipcLogger.info("Desktop directory path is " + desktopDir)
const args = process.argv.slice(2)
if( !args || args.length === 0) {
  ipcLogger.info('IPC Cli is invoked without any parameters. It is going to run with start as default command')
}
const cmdArgs: cliArgs = {command: args[0]  ? args[0] : 'start' };

ipcLogger.info(`invoking cliExecuteCommand with ${cmdArgs.command}`)

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


const getAppConfig = async () => {
  const providerLoader = ProviderLoaderFactory(ipcConfig.appConfig, ipcLogger)
  const providers = await providerLoader.load()
  const providerValidator = new ProviderValidator(ipcLogger)
  if( providerLoader.validateProviderConfig(providers)) {
    cliExecuteCommand(cmdArgs,ipcLogger,providers, providerValidator).then((code: number | void ) => {
      ipcLogger.info(`cliExecuteCommand completed with return code : ${code}`)
    }).catch((err: Error)  => {
      ipcLogger.info(`cliExecuteCommand completed with error : ${err.toString()}`)
      process.exit();
    })
  } else {
    ipcLogger.info(`Invalid application config please correct application configuration`)
  }
}
getAppConfig();




