import * as WebSocket from 'ws'
import { Logger } from './ipc-logger'
import { IncomingMessage } from 'http'
// import * as fs from 'fs'
// import * as path from  'path'
// import * as https from 'https'
import * as http from 'http'
import * as url from 'url'
import { App, AppConfig, Provider, ProviderValidator } from './ipc-provider'

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
const enum eventType {
  contextChangeEvent = 'contextChange',
  publishedEvent = 'publishedEvent',
  navigateEvent = 'navigateEvent',
  contextGetEvent = 'getValueReturn',
  initializeResponse = 'initializeResponse'
}


/**
 * class of IPCHost
 * Encapsulates server behaviors and exposes  methods for controlling IPCHost
 */

export class IPCHost  {
  private readonly ipcHostPort = 8000;  //default port for IPC
  private readonly ipcHostPath = '/etpipchost';  //path
  private readonly ipcHostName = 'etpipchost.bankofamerica.com';  //host
  private socketStore = new Map();
  private currentContextStore = new Map();
  private ipcHost : WebSocket;
  private logger : Logger;
  private newConnId = 0;
  private server: any;
  private apps : App[];
  private providers : Provider[]
  private providerValidator : ProviderValidator

  constructor(logger : Logger, appConfig :  AppConfig, providerValidator : ProviderValidator) {
    this.logger = logger
    this.providers = appConfig.providers;
    this.apps = appConfig.apps;
    this.providerValidator = providerValidator
    // logger.info(" CLient app json is " + JSON.stringify(this.ipcAppConfig))
    // this.validateAppConfig();
    // const cwd  = process.env.ipcCWD | process.cwd();
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
    if(!parsedMsg || typeof (parsedMsg) === 'undefined' || parsedMsg == null )
      return;
    //message stucture (type,key,data)
    switch(parsedMsg.type) {
      case 'publish':
        this.handlePublish(ws, parsedMsg);
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

private broadcast(srcWs: WebSocket, type: eventType, data:any) {
  //get the src client  info and check if clientSessionId is not empty
  const clientInfo = this.socketStore.get(srcWs);
  const sessionId = (clientInfo.clientSessionId === null || clientInfo.clientSessionId === '' || typeof (clientInfo.clientSessionId) === 'undefined') ? null : clientInfo.clientSessionId
  this.log(`Message received from App name: ${clientInfo.appName} / Client id ${clientInfo.connId} / session id : ${sessionId} / message type ${data.type} /key : ${data.key}`, logType.info )
  this.dumpData({fromApp : clientInfo.appName, data :data})
  let subScribers;
  if(type == eventType.publishedEvent){
      subScribers = this.providerValidator.getSubscribersOfAppEvent(this.providers,clientInfo.appName, data.key);
      console.log("subscribers of App event ->" + JSON.stringify(subScribers));
  }else if(type == eventType.contextChangeEvent){
      subScribers = this.providerValidator.getConsumersOfAppContext(this.providers,clientInfo.appName, 'set');
      console.log("consumers of App context ->" + JSON.stringify(subScribers));
  }

  this.socketStore.forEach((targetClientInfo , targetSocket ) => {
    //Do not broadcast to origination socket ** this check to be there until we have configuration support like in DF
    if(targetSocket === srcWs)
      return
    if(!subScribers.includes(targetClientInfo.appName)){
      if(type == eventType.publishedEvent){
          this.log(`The appName ${targetClientInfo.appName} not allowed for subscribing to the app ${clientInfo.appName} for publish event`, logType.info)
      }else if(type == eventType.contextChangeEvent){
          this.log(`The appName ${targetClientInfo.appName} not allowed for setting the context to the app ${clientInfo.appName}`, logType.info)
      }
      return
    }else{
      if(type == eventType.publishedEvent){
          this.log(`The appName ${targetClientInfo.appName} allowed for subscribing to the app ${clientInfo.appName} for publish event`, logType.info)
      }else if(type == eventType.contextChangeEvent){
          this.log(`The appName ${targetClientInfo.appName} allowed for setting the context to the app ${clientInfo.appName}`, logType.info)
      }
    }
    if(sessionId)
      this.wsEmitToUserSession(sessionId,targetClientInfo,targetSocket, type, data)
    else if (targetClientInfo.clientSessionId === null)
      this.wsEmit(targetSocket,type, data.key, data.data, targetClientInfo)
  });
}
// citrix server, cloud specific
private wsEmitToUserSession(srcSessionId: string, targetClientInfo: any, ws: WebSocket, type: eventType, data: any) {
  if(targetClientInfo.clientSessionId == srcSessionId)
    this.wsEmit(ws,type, data.key, data.data, targetClientInfo)
}

private wsEmit(ws: WebSocket, type: eventType, key: string, data: any,  targetClientInfo: any) {
  if(ws.readyState === WebSocket.OPEN) {
    // this.outputMsg('Msg to client ' + GetSocketInfo(ws) + ';' +  DataToString(type, key, data));
    ws.send(JSON.stringify({
      type: type,
      key:key,
      data: data
    }));
    if(targetClientInfo)
      this.log(`Message sent to ${targetClientInfo.appName} / Client id: ${targetClientInfo.connId}/ session id: ${targetClientInfo.clientSessionId}`, logType.info);
    this.dumpData({type : type, key:key ,data :data})
  }else {
    if(targetClientInfo)
      this.log(`This client socket state is not ready state. ${targetClientInfo.appName} / Client id: ${targetClientInfo.connId}/ session id: ${targetClientInfo.clientSessionId} / socket state ${ws.readyState}`, logType.error)
  }
}


/**
 * Handle Initialization message from clients
 * data.key is mandatory else client socket will be closed
 */

private handleInitialize(ws: WebSocket, data:any) {
  if(!data || !data.key || data.key.length == 0) {
    const message = 'Client is attempting to initialize without application name. socket will be closed';
    this.log(message, logType.error)
    const response = Object.assign({},{
        success: false, duplicate: false, message: message
      });
    this.wsEmit(ws, eventType.initializeResponse,(data && data.key) ? data.key : 'Application name is not provided', response, null);
    return ws.close();
  }
  const appName = data.key? data.key.split(';')[0] : data.key;
  if(this.providerValidator.checkIfAppNameAllowed(this.apps,appName) == false) {
    this.log(`App name is not allowed  ${appName}`, logType.error)
    const message = 'Client is attempting to initialize non-allowed application name. socket will be closed';
    const response = Object.assign({},{
      success: false, duplicate: false, message: message
    });
    this.wsEmit(ws, eventType.initializeResponse,(data && data.key) ? data.key : 'Application name is not allowed', response, null);
    return ws.close();
  }
  const clientInfo = this.socketStore.get(ws);
  if(clientInfo) {
    clientInfo.clientSessionId = (data.data && data.data.clientSessionId && data.data.clientSessionId !== '' && (!data.data.clientSessionId.includes("undefined"))) ? data.data.clientSessionId : null;
    clientInfo.appName = appName;
    clientInfo.eventStore.push(data.data && data.data.events ? data.data.events : '');
    clientInfo.contextStore.push(data.data && data.data.contexts ? data.data.contexts : '');
    const duplicate = this.isDuplicate(clientInfo);
    const response = Object.assign({},{
      success: true, duplicate: duplicate, message: duplicate? 'There is already an application connected and initialized with same information' : ''
    });
    this.wsEmit(ws, eventType.initializeResponse, appName, response, clientInfo)
    this.log(`Application ${appName} initialized with Client Id: ${clientInfo.connId} and Session Id: ${clientInfo.clientSessionId}`, logType.info)
    this.dumpData(response)
  } else {
    this.log('Error: Unexpected condtion - initializing on unexpected socket. Socket info is not found in the store. socket will be closed', logType.error);
    ws.close();
  }
}

/**
 * cuplicate client check
 * true if there is a client with same application name and client session id ( client session id is optional)
 */
 private isDuplicate(srcClientInfo:  any): boolean {
  if(!srcClientInfo || srcClientInfo.appName === '' || srcClientInfo.appName === null || srcClientInfo.appName === undefined)
    return false;
  const appName = srcClientInfo.appName;
  const clientSessionId = srcClientInfo.clientSessionId;

  const matchedAppArray = Array.from(this.socketStore.values()).filter(value =>  value.appName.toLowerCase() === appName.toLowerCase());
  if(clientSessionId) {
    const appWithClients = matchedAppArray.filter(value => {
      if(value &&  value.clientSessionId)
        return value.clientSessionId.toLowerCase() === clientSessionId.toLowerCase()
      else return false;
    })
    return appWithClients.length > 1 ? true : false;
  }else {
    const appWithClients = matchedAppArray.filter(value => value.clientSessionId === null);
    return appWithClients.length > 1 ? true : false;
  }
 }

 /**
  * Handle publish from clients
  */

 private handlePublish(ws:WebSocket, data:any) {
  if(!this.isClientInitialized(ws)) {
    return
  }
  this.broadcast(ws,eventType.publishedEvent, data)
 }

  /**
  * Handle setting context from client
  */
  private handleSetContext(ws:WebSocket, data:any) {
    if(!this.isClientInitialized(ws)) {
      return
    }

    const clientInfo = this.socketStore.get(ws);
    let key: Object = {
      clientId: clientInfo.clientSessionId,
      contextKey: data.key
    }
    const fireChange = this.currentContextStore.get(key) !== data.data;
    this.currentContextStore.set(key, data.data);
    if(fireChange) {
      this.log(`About to fire context change for new data via set for ${data.key}`, logType.info);
      this.broadcast(ws, eventType.contextChangeEvent, data)
    }
  }
  private handleNavigateTo(ws:WebSocket, data:any) {
    if(!this.isClientInitialized(ws)) {
      return
    }
    this.broadcast(ws, eventType.navigateEvent, data)
  }
  private handleGetContext(ws:WebSocket, data:any) {
    if(!this.isClientInitialized(ws)) {
      return
    }
    const clientInfo = this.socketStore.get(ws);
    let currKey = {}
    if(data.key && data.key != "") {
      this.log(`Retrieving context data for ${data.key}`, logType.info);
      for( let key of Array.from(this.currentContextStore.keys())) {
        if(key.clientId === clientInfo.clientSessionId && key.contextKey === data.key) {
          currKey = key;
        }
      }
      const currContext = this.currentContextStore.get(currKey);
      this.wsEmit(ws, eventType.contextGetEvent, data.key, currContext ? currContext : null, clientInfo)
    } else {
      this.logger.info('Retrieving all context data');
      const allContexts = Object.assign({}, this.copyObjects(clientInfo));
      this.wsEmit(ws, eventType.contextGetEvent, data.key, JSON.stringify(allContexts), clientInfo)
    }
  }

  private copyObjects(clientInfo: any) : Object {
    let target: Object = {}
    for( let key of Array.from(this.currentContextStore.keys())) {
      if(key.clientId === clientInfo.clientSessionId ) {
        target[key.contextkey] == this.currentContextStore.get(key)
      }
    }
    return target;
  }

  private validatePath(req: IncomingMessage): boolean {
    try {
        const urlObj = url.parse(req.url ? req.url : '')
        let path = urlObj.path;
        if(path == "/") {
          path = undefined
        }
        if(path === this.ipcHost.path)
          return true;
        else
          throw new Error('An attempt to connect with out proper url path. Closing the connection from this client')
    }catch (e) {
      this.log(e.message, logType.error)
      this.dumpData(req.headers);
      return false;
    }
  }

  private checkHost(req: IncomingMessage): boolean {
    let good: boolean = true;
    if(!req) {

      return false;
    } else {
      //validate path
      if(!this.validatePath(req))
        return false


      //connection from only localhost
      const onlyLocalHost = req.headers ? req.headers.host : null
      // if (onlyLocalHost !== `localhost${this.default_ipc_port}`)
      if (onlyLocalHost !== `${this.ipcHostName}${this.ipcHostPort}` && onlyLocalHost !== `localhost:${this.ipcHostPort}`) {
        this.log('An attempt to connect from network / or not using localhost. Closing the connection from this client', logType.error);
        this.dumpData(req.headers);
        return false;
      }

      //whitelisted app only check
      if(!this.originCheck(req))
        return false;
    }
    return good;
  }

  private _addToSocketStore(ws: WebSocket, req: IncomingMessage) {
    this.socketStore.set(ws, {appName : '', clientSessionId : '', connId: ++this.newConnId, eventStore: [], contextStore: []});
    this.log(`New connection request received and new Connection id: ${this.newConnId} assigned`, logType.info);
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

  private isClientInitialized(ws: WebSocket): boolean {
    let retValid: boolean = false;
    const clientInfo = this.socketStore.get(ws)
    if(clientInfo.appName && clientInfo.appName.length > 0)
      retValid = true;
    else {
      this.log("Client is not initialized. Socket will be closed", logType.error);
      ws.close();
    }
    return retValid;
  }

  private parseMessage(data: any ): message | undefined {
    try {
      const message: message = JSON.parse(data)
      //validate the message is structured
      if(message && message.hasOwnProperty('type') === true && message.hasOwnProperty('key') === true ) {
        //type and key are mandatory
        if (message.type !== null && message.type !== undefined && message.key !== null && message.key !== undefined )
          return message
        else
          throw new Error(data)
      } else
        throw new Error(data)
    }catch(e) {
      this.log(`Client payload is not in the proper format. Data received : ${e.message}`, logType.error)
    }
  }
  private originCheck(req: IncomingMessage): boolean {
    const originUrl = (req.headers && req.headers.origin && typeof(req.headers.origin) === 'string') ? req.headers.origin : '';
    //only web applications are subjected to this validation
    if(originUrl) {
      try  {
        //const host = new url.URL(originUrl);
        const host = url.parse(originUrl);
        //currenty this validation applies to only web applications
        //this.log('hostname ' + host.hostname + ' is trying to connect', logType.info);
        if(host.hostname && !(host.hostname.endsWith('bankofamerica.com') || host.hostname=='localhost')) {
          this.log('An attempt to connect from invalid origin. Closing the connection from this client', logType.error)
          this.dumpData(req.headers);
          return false;
        }
      }catch(e) {
        this.log('An error occured while parsing the origin url. Closing the connection from this client', logType.error)
        this.dumpData(req.headers);
        return false;
      }
    }
    return true;
  }
  private canOnlyUseAsLocalHost(req: IncomingMessage): boolean {
    //this is not fully impplemented. since it became wss - we need to validate
    //with local ip address and the ip address from where the call is coming
    const onlyLocalHost = req.headers? req.headers.host : null;
    //if(onlyLocalHost !== `localhost:${this.default_ipc_port}`)
    if(onlyLocalHost !== `${this.ipcHostName}:${this.ipcHostPort}`) {
      this.log('An attempt to connect from network / or not using localhost. Closing the connection from this client', logType.error)
      this.dumpData(req.headers);
      return false;
    }
    return true;
  }
}



