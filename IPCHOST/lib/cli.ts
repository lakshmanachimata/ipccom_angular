import { ProviderValidator } from './../src/ipc-provider';
import { AppConfig, Provider } from '../src/ipc-definitions';
//const WebSocket = require('ws')
import { IPCHost } from '../src/ipc-host'
import { Logger } from '../src/ipc-logger'


export type cliArgs = { command : string, data?: object | any}

/**
 * IPC Cli command interface
 */
interface IPCCliCommand {
  execute(): Promise<number>;
}

interface IPCCommandInterface<T1,T2,T3> {
  new(T1,T2,T3) : IPCCliCommand;
}

/**
 * IPC cli Command Class
 * stop command object
 */

class IPCStopCommand implements IPCCliCommand {
    constructor() {
      //TODO
    }
    public async execute(): Promise<number> {
        return Promise.reject('Not Implemented yet')
    }
}

/**
 * IPC cli Command Class
 * IPC start command
 */


class IPCStartCommand implements IPCCliCommand {
  private ipcHost : IPCHost;
  constructor(logger : Logger, appConfig: AppConfig,providerValidator : ProviderValidator) {
    this.ipcHost = new IPCHost(logger,appConfig,providerValidator)
  }
  public async execute(): Promise<number> {
    const retCode = await this.ipcHost.start();
    return retCode
  }
}

/**
 * AppLauncher cli command store
 */

const commandStore = new Map<string, IPCCommandInterface<Logger, AppConfig, ProviderValidator>>();
commandStore.set('start', IPCStartCommand);
commandStore.set('stop', IPCStopCommand);

/**
 * executeCommand function
 * @param option type of cliArgs
 * @param logger type of Logger
 */

export const cliExecuteCommand = async (options: cliArgs, logger: Logger, appConfig: AppConfig ,providerValidator : ProviderValidator): Promise<number> => {
  let retCode : number = 1
  if(options && options.command && (options.command !== '' || options.command !== undefined)){
    //pull a command
    const cmd: IPCCommandInterface<Logger,Provider[],ProviderValidator> = <IPCCommandInterface<Logger,Provider[],ProviderValidator >>commandStore. get(options.command);
    //execute it
    retCode = cmd ? await new cmd(logger,appConfig,providerValidator).execute() : 1;
    if(retCode === 0) {
      logger.log('ETP-IPCHost strted');
    }
    else {
      logger.error('Unable to start ETP-IPCHost');
    }
  } else {
    logger.error('Valid IPC CLI commands are start and stop, It can not be empty')
    retCode = 1
  }
  return retCode;
}
