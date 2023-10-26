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

if(!ipcConfig) {
  console.error('ETP IPC Host confiuration missing. Unable to start')
  process.exit(1)
}

const homeDir = os.homedir()
const desktopDir = `${homeDir}/Desktop`;


// const getAppConfigData = async() => {
//   return new Promise((resolve, reject) => {
//     http.get('http://localhost:8000/', (res) => {
//       const { statusCode } = res;
//       const contentType = res.headers['content-type'];

//       let error;
//       // Any 2xx status code signals a successful response but
//       // here we're only checking for 200.
//       if (statusCode !== 200) {
//         error = new Error('Request Failed.\n' +
//                           `Status Code: ${statusCode}`);
//       } else if (!/^application\/json/.test(contentType)) {
//         error = new Error('Invalid content-type.\n' +
//                           `Expected application/json but received ${contentType}`);
//       }
//       if (error) {
//         // console.error(error.message);
//         // Consume response data to free up memory
//         reject(error)
//         res.resume();
//         return;
//       }

//       res.setEncoding('utf8');
//       let rawData = '';
//       res.on('data', (chunk) => { rawData += chunk; });
//       res.on('end', () => {
//         try {
//           const parsedData = JSON.parse(rawData);
//           resolve(parsedData)
//           // console.log(parsedData);
//         } catch (e) {
//           reject(e.message)
//           // console.error(e.message);
//         }
//       });
//     }).on('error', (e) => {
//       reject(e.message)
//       // console.error(`Got error: ${e.message}`);
//     });
//   })
// }

// const getAppConfigDataRoot = async() => {
//   ipcAppConfig = await getAppConfigData()
// }
// getAppConfigDataRoot();

ipcConfig.loggerProviderProperties.filePath = ipcConfig.loggerProviderProperties.filePath? ipcConfig.loggerProviderProperties.filePath : desktopDir

const ipcLogger : Logger = loggerFactory(ipcConfig)
ipcLogger.info("Desktop directory path is " + desktopDir)
const args = process.argv.slice(2)
if( !args || args.length === 0) {
  ipcLogger.info('IPC Cli is invoked without any parameters. It is going to run with start as default command')
}
const cmdArgs: cliArgs = {command: args[0]  ? args[0] : 'start' };

ipcLogger.info(`invoking cliExecuteCommand with ${cmdArgs.command}`)

cliExecuteCommand(cmdArgs,ipcLogger,ipcAppConfig).then((code: number | void ) => {
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



