import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os'; // See: https://www.npmjs.com/package/os
import * as http from 'http'

import { Logger, loggerFactory } from '../src/ipc-logger';
import { cliExecuteCommand, cliArgs } from './cli';
const IPCCLILOGGERFILE = 'ETP-IPCCLI-Logger';
const cwd = process.env.ipcCWD || process.cwd()
const ipcConfig = JSON.parse(fs.readFileSync(path.resolve(cwd,'../configuration/ipc.json'), 'utf-8'))
let ipcAppConfig = JSON.parse(fs.readFileSync(path.resolve(cwd,'../configuration/providers.json'), 'utf-8'))

if(!ipcConfig) {
  console.error('ETP IPC Host confiuration missing. Unable to start')
  process.exit(1)
}

const homeDir = os.homedir()
const desktopDir = `${homeDir}/Desktop`;


const ipcLogger : Logger = loggerFactory(ipcConfig)

const getAppConfigData = async() => {
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
        reject(e.message)
      });
    }catch(e){
      reject(e.message)
    }
  })
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

const getAppConfigDataRoot = async() => {
  ipcLogger.log("getAppConfigDataRoot ")
  ipcAppConfig = await getAppConfigData()
  if(ipcAppConfig && ipcAppConfig.length) {
    cliExecuteCommand(cmdArgs,ipcLogger,ipcAppConfig).then((code: number | void ) => {
      ipcLogger.info(`cliExecuteCommand completed with return code : ${code}`)
    }).catch((err: Error)  => {
      ipcLogger.info(`cliExecuteCommand completed with error : ${err.toString()}`)
      process.exit();
    })
  }
  ipcLogger.log("getAppConfigDataRoot " + JSON.stringify(ipcAppConfig))
}
ipcLogger.log("getAppConfigDataRoot 11")

// getAppConfigDataRoot();


cliExecuteCommand(cmdArgs,ipcLogger,ipcAppConfig).then((code: number | void ) => {
  ipcLogger.info(`cliExecuteCommand completed with return code : ${code}`)
}).catch((err: Error)  => {
  ipcLogger.info(`cliExecuteCommand completed with error : ${err.toString()}`)
  process.exit();
})



