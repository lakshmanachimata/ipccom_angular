import { Provider, ProviderValidator } from './../src/ipc-provider';
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

interface IPCCommandInterface<T1,T2> {
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
  constructor(logger : Logger, providers: Provider[],providerValidator : ProviderValidator) {
    this.ipcHost = new IPCHost(logger,providers,providerValidator)
  }
  public async execute(): Promise<number> {
    const retCode = await this.ipcHost.start();
    return retCode
  }
}

/**
 * AppLauncher cli command store
 */

const commandStore = new Map<string, IPCCommandInterface<Logger, Provider[]>>();
commandStore.set('start', IPCStartCommand);
commandStore.set('stop', IPCStopCommand);

/**
 * executeCommand function
 * @param option type of cliArgs
 * @param logger type of Logger
 */

export const cliExecuteCommand = async (options: cliArgs, logger: Logger, providers: Provider[] ,providerValidator : ProviderValidator): Promise<number> => {
  let retCode : number = 1
  if(options && options.command && (options.command !== '' || options.command !== undefined)){
    //pull a command
    const cmd: IPCCommandInterface<Logger,Provider[]> = <IPCCommandInterface<Logger,Provider[] >>commandStore. get(options.command);
    //execute it
    retCode = cmd ? await new cmd(logger,providers,providerValidator).execute() : 1;
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
