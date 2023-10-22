import * as WebSocket from 'ws'
import { Logger } from './ipc-logger'
import { IncomingMessage } from 'http'
// import * as fs from 'fs'
// import * as path from  'path'
// import * as https from 'https'
import * as http from 'http'
import * as url from 'url'

//type of application Information
type appInfo = { connId : string, appName : string}
//message type
type message = {type : string , key : string , data :  object | any }
//valid logger types
const enum logType {
  error = 'error',
  info = 'info',
  log = 'log'
}
const enum evnetType {
  contextChangeEvent = 'contextChange',
  publishedEvent = 'publishedEvent',
  navigateEvent = 'navigateEvent',
  contextGetEvent = 'contextGetEvent',
  initializeResponse = 'initializeResponse'
}


/**
 * class of IPCHost
 * Encapsulates server behaviors and exposes  methods for controlling IPCHost
 */

export class IPCHOst  {
  private readonly ipcHostPort = 8000;  //default port for IPC
  private readonly ipcHostPath = '/etpipchost';  //path
  private readonly ipcHostName = 'etpipchost.bankofamerica.com';  //host
  private socketStore = new Map();
  private currentContextStore = new Map();
  private ipcHost : WebSocket;
  private logger : Logger;
  private newConnId = 0;
  private server: any;

  constructor(logger : Logger ) {
    this.logger = logger
    const cwd  = process.env.ipcCWD | process.cwd();
    //this.ipcHost = new WebSocet.Server({port : this.default_ipc_port, path: this.etpipchostpath })
    //Mamascomment//const key = fs.readFileAsync(path.resolve(cwd, '../configuration/etpipchopstkey.pem'))
    //Mamascomment//const cert = fs.readFileAsync(path.resolve(cwd, '../configuration/etpipchopstcert.pem'))
    //const serverOptions = https.ServerOptions = {cert: cert, key: key}
    this.server = http.createServer();
    this.ipcHost = new WebSocket.Server({server : this.server })
    this.server.listen(this.ipcHostPort);
    this.log("IPC - new instance created", logType.info)
  }
  //public methods
  /**
   * Set IPCHost to listen to connection, message and close request from clients
   * Keep valid connection requests in memory store
   */
  start(): Promise<number> {
    return new Promise((resolve, reject ) => {
      try {
        this.ipcHost.on('connection',(ws:WebSocket, req:http.IncomingMessage) => {
          if(!(ws) || !(req)) {
            this.log('An attempt to connect with invalid parameters', logType.error) //TODO need to dump both ws and req in the log
            return;
          }
          // log socket and request details
          // this.dumpdata(req)
          if(!this.checkHost(req)) {
            ws.close();
            return;
          }
          // this.log('new connection request headers ' + JSON.stringify(req.headers), logType.info)

          this._addToSocketStore(ws,req);

          ws.on('message',(message : any) => {
            if(!message) {
              this.log('An empty message received a client', logType.error, ws)
              return
            }
            this.handleMessage(ws, message)
          })
          ws.on('close',() => {
            const clentInfo = this.socketStore.get(ws);
            const appPart = clentInfo.appName? `/ App Name : ${clentInfo.AppName}` : ''
            this.log(`Closing the connection based on a request  from client id: ${clentInfo.clientId} ${appPart}`, logType.info)
            this.socketStore.delete(ws)
          })
          resolve(0)
        });
      }catch(error) {
        this.log(error.message , logType.error)
        reject(1)
      }
    })
  }

  /**
   * Empties socket store
   */
  close() {
    if(this.socketStore) {
      this.socketStore.clear()
    }
    if(this.ipcHost !== null) {
      this.ipcHost.close()
    }
  }

  /**
   * Close http server instance
   */
  closeServer() {
    this.close()
    if(this.server !== null) {
      this.server.close()
    }
  }
  // private methods
  /**
   * Generic message handler
   * Route messages to specific handlers
   */
  private handleMessage(ws : WebSocket , message : any) {
    // validate incoming message for proper structure
    const parsedMsg = this.parseMessage(message);
    if(!parsedMsg || typeof (parsedMsg === 'undefined' || parsedMsg == null ))
      return;
    //message stucture (type,key,data)
    switch(parsedMsg.type) {
      case 'publish':
        this.publishMessage(ws, parsedMsg);
        break;
      case 'set':
        this.handleSetContext(ws, parsedMsg);
        break;
      case 'get':
        this.handleGetContext(ws, parsedMsg);
        break;
      case 'navigateTo':
        this.handleNavigateTo(ws, parsedMsg);
        break;
      case 'initialize':
        this.handleInitialize(ws, parsedMsg)
        break;
    }
  }

/**
 * Handles message broadcasting to all valid socket clients
 * @srcWs Source client from where message received
 * @type Message type
 * @data Messaage payload
 */

private broadcast(srcWs: WebSocket, type: evnetType, data:any) {
  //get the src client  info and check if clientSessionId is not empty
  const clientInfo = this.socketStore.get(srcWs);
  const sessionId = (clientInfo.clientSessionId === null || clientInfo.clientSessionId === '' || typeof (clientInfo.clientSessionId) === 'undefined') ? null : clientInfo.clientSessionId
  this.log(`Message received from App name: ${clientInfo.appName} / Client id ${clientInfo.connId} / session id : ${sessionId} / message type ${data.type} /key : ${data.key}`, logType.info )
  this.dumpData({fromApp : clientInfo.appName, data :data})
  this.socketStore.forEach((targetClientInfo , targetSocket , mape) => {
    //Do not broadcast to origination socket ** this check to be there until we have configuration support like in DF
    if(targetSocket === srcWs)
      return
    if(sessionId)
      this.wsEmitToUserSession(sessionId,targetClientInfo,targetSocket, type, data)
    else if (targetClientInfo.clientSessionId === null)
      this.wsEmit(targetSocket,type, data.key, data.data, targetClientInfo)
  });
}
// citrix server, cloud specific
private wsEmitToUserSession(srcSessionId: string, targetClientInfo: any, ws: WebSocket, type: evnetType, data: any) {
  if(targetClientInfo.clientSessionId == srcSessionId)
    this.wsEmit(ws,type, data.key, data.data, targetClientInfo)
}

private wsEmit(ws: WebSocket, type: evnetType, key: string, data: any,  targetClientInfo: any) {
  if(ws.readState === 1) {
    // this.outputMsg('Msg to client ' + GetSocketInfo(ws) + ';' +  DataToString(type, key, data));
    ws.send(JSON.stringify({
      type: type,
      key:key,
      data: data
    }));
    this.log(`Message sent to ${targetClientInfo.appName} / Client id: ${targetClientInfo.connId}/ session id: ${targetClientInfo.clientSessionId}`, logType.info);
    this.dumpData({type : type, key:key ,data :data})
  }else {
    this.log(`This client socket state is not ready state. ${targetClientInfo.appName} / Client id: ${targetClientInfo.connId}/ session id: ${targetClientInfo.clientSessionId}`, logType.error)
  }
}

/**
 * Handle Initialization message from clients
 * data.key is mandatory else client socket will be closed
 */

private handleInitialize(ws: WebSocket, data:any) {

}

/**
 * cuplicate client check
 * true if there is a client with same application name and client session id ( client session id is optional)
 */
 private isDuplicate(srcClientInfo:  any): boolean {

  return false;
 }

 /**
  * Handle publish from clients
  */

 private handlePublish(ws:WebSocket, data:any) {
  if(!this.isClientInitialized(ws)) {
    return
  }
  this.broadcast(ws,evnetType.publishedEvent, data)
 }

  /**
  * Handle setting context from client
  */
  private handleSetContext(ws:WebSocket, data:any) {
    if(!this.isClientInitialized(ws)) {
      return
    }
  }
  private handleNavigateTo(ws:WebSocket, data:any) {
    if(!this.isClientInitialized(ws)) {
      return
    }
  }
  private handleGetContext(ws:WebSocket, data:any) {
    if(!this.isClientInitialized(ws)) {
      return
    }
  }

  private copyObjects(clientInfo: any) : Object {
    let target: Object = {}
    return target;
  }

  private validatePath(req: IncomingMessage): boolean {
    return false;
  }
  private _addToSocketStore(ws: WebSocket, req: IncomingMessage) {

  }

  private checkHost(req: IncomingMessage): boolean {
    return false;
  }

  private getAppInfo(ws: WebSocket): appInfo | null {
    const cInfo = (ws) ? this.socketStore.get(ws) : null
    return (cInfo) ? {connId : cInfo.connId , appName : cInfo.appName } : null
  }

  private log(message : string, type : logType , ws? : WebSocket)  {
    let appInfo : appInfo | null = this.getAppInfo(ws)
    let payLoad : any //TODO type
    if(appInfo)
      payLoad = `${message}/ Client Id: ${appInfo.connId}/App name: ${appInfo.appName}`
    else
      payLoad = `${message}`
    switch(type) {
      case 'error':
        this.logger.error(payLoad)
        break;
      case 'info':
        this.logger.info(payLoad)
        break;
      case 'log':
        this.logger.log(payLoad)
        break;
      default:
        this.logger.log(payLoad)
        break;
    }
  }


private dumpData(...data): void {
  this.logger.dumpData(...data);
}


  /**
   * validate incoming socket before accepting publish, context set and get, navigate etc
   * Validate incoming socket for initialization completed
   */

  private isClientInitialized(req: IncomingMessage): boolean {
    return false;
  }

  private parseMessage(data: any ): message | undefined {
    try {
      const message: message = JSON.parse(data)
    }catch(e) {

    }
  }
  private originCheck(req: IncomingMessage): boolean {
    return false;
  }
  private canOnlyUseAsLocalHost(req: IncomingMessage): boolean {
    return false;
  }
}



