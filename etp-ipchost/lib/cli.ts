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

interface IPCCommandInterface<T> {
  new(T) : IPCCliCommand;
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


class IPCSatCommand implements IPCCliCommand {
  private ipcHost : IPCHost;
  constructor(logger : Logger) {
    this.ipcHost = new IPCHost(logger)
  }
  public async execute(): Promise<number> {
    const retCode = await this.ipcHost.start();
    return retCode
  }
}
