import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os'; // See: https://www.npmjs.com/package/os
import * as http from 'http'

import { Logger, loggerFactory } from '../src/ipc-logger';
import { cliExecuteCommand, cliArgs } from './cli';
import { ClientApp } from '../src/clientapp';
const IPCCLILOGGERFILE = 'ETP-IPCCLI-Logger';
const cwd = process.env.ipcCWD || process.cwd()
const ipcConfig = JSON.parse(fs.readFileSync(path.resolve(cwd,'../configuration/ipc.json'), 'utf-8'))
const ipcAppConfig : ClientApp[] = JSON.parse(fs.readFileSync(path.resolve(cwd,'../configuration/providers.json'), 'utf-8'))
const homeDir = os.homedir()
const desktopDir = `${homeDir}/Desktop`;
const ipcLogger : Logger = loggerFactory(ipcConfig)

if(!ipcConfig) {
  console.error('ETP IPC Host confiuration missing. Unable to start')
  process.exit(1)
}

const getAppConfigData = async() => {
  if(ipcConfig.appConfig == "remote") {
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
  }else {
    return new Promise((resolve, reject) => {
      resolve(ipcAppConfig)
    });
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
/**
 * primary validation of json will be done here more can be added later
 * @param appConfig
 * @returns
 */
const validateAppConfig = (appConfig : ClientApp[]): boolean =>
{
  if(!appConfig) {
    return false;
  }
  let valid : boolean = true
  let appdups : any[] = [];
  let eventdups : any[] = [];
  if(appConfig.length) {
    for(let  ai = 0; ai < appConfig.length; ai++) {
      for(let aj = ai + 1; aj < appConfig.length; aj++) {
        if(appConfig[ai].provider == appConfig[aj].provider) {
          appdups.push({key : ai, value :  appConfig[ai].provider})
        }
      }
      for(let  ei = 0; ei < appConfig[ai].events.length; ei++) {
        for(let ej = ei + 1; ej < appConfig[ai].events.length; ej++) {
          if(appConfig[ai].events[ei].eventname == appConfig[ai].events[ej].eventname) {
            eventdups.push({key : ej, value : appConfig[ai].events[ej].eventname, app : appConfig[ai].provider})
          }
        }
      }
    }
    if(eventdups.length) {
      for (var eai = 0;  eai < eventdups.length; eai++ ) {
        ipcLogger.info(` duplicate provider ${eventdups[eai].value} found at position ${eventdups[eai].key+1}  for the ${eventdups[eai].app}`)
      }
    }
    if(appdups.length) {
      for (var dai = 0;  dai < appdups.length; dai++ ) {
        ipcLogger.info(` duplicate provider ${appdups[dai].value} found at position ${appdups[dai].key+1}  `)
      }
    }
  }
 return valid
}

const getAppConfig = async() => {
  const appConfigData : ClientApp[]  = await getAppConfigData() as ClientApp[]
  const appConfig =  (appConfigData && appConfigData.length) ? appConfigData : ipcAppConfig
  if( validateAppConfig(appConfig)) {
    cliExecuteCommand(cmdArgs,ipcLogger,appConfig).then((code: number | void ) => {
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




