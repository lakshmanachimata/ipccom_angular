import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os'; // See: https://www.npmjs.com/package/os
import * as http from 'http'

import { Logger, loggerFactory } from '../src/ipc-logger';
import { cliExecuteCommand, cliArgs } from './cli';
const IPCCLILOGGERFILE = 'ETP-IPCCLI-Logger';
const cwd = process.env.ipcCWD || process.cwd()
const ipcConfig = JSON.parse(fs.readFileSync(path.resolve(cwd,'../configuration/ipc.json'), 'utf-8'))
const ipcAppConfig = JSON.parse(fs.readFileSync(path.resolve(cwd,'../configuration/providers.json'), 'utf-8'))
const homeDir = os.homedir()
const desktopDir = `${homeDir}/Desktop`;
const ipcLogger : Logger = loggerFactory(ipcConfig)

if(!ipcConfig) {
  console.error('ETP IPC Host confiuration missing. Unable to start')
  process.exit(1)
}

const getAppConfigData = async() => {
  if(ipcConfig.loadFromLocal) {
    return new Promise((resolve, reject) => {
      resolve(ipcAppConfig)
    });
  }else {
    return new Promise((resolve, reject) => {
      try {
        var options = {
          host: 'localhost',
          port:4000,
          path: ''
        };
        var req = http.get(options, function(res) {
          let rawData = '';
          res.on('data', function(chunk) {
            rawData += chunk;
          }).on('end', function() {
            var body = JSON.parse(rawData)
            resolve(body)
          })
        });

        req.on('error', function(e) {
          ipcLogger.error(`provider json loading from remote failed with error ${e.message}`)
          resolve([])
        });
      }catch(e){
        ipcLogger.error(`provider json loading from remote failed with error ${e.message}`)
        resolve([])
      }
    })
  }

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

const validateAppConfig = () =>
{
  if(!ipcAppConfig || !ipcAppConfig.length) {
    return false;
  }
  return true;
}

const getAppConfigDataRoot = async() => {
  const ipcConfig : any  = await getAppConfigData()
  function getAppConfig() : any {
    return ipcConfig && ipcConfig.length ? ipcConfig : ipcAppConfig
  }
  if( validateAppConfig()) {
    cliExecuteCommand(cmdArgs,ipcLogger,getAppConfig()).then((code: number | void ) => {
      ipcLogger.info(`cliExecuteCommand completed with return code : ${code}`)
    }).catch((err: Error)  => {
      ipcLogger.info(`cliExecuteCommand completed with error : ${err.toString()}`)
      process.exit();
    })
  }
}
getAppConfigDataRoot();




