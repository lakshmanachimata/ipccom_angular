import { Observable,Subject } from "rxjs";
import { IpcControl,IpcEvent,DFContext,DFOptions,DFNavigatorQueryPair } from "./ipc.interface";
import {filter, map} from 'rxjs/operators'
// import * as WebSocket from 'ws'
import WebSocket from 'ws';

export class IpcControlImpl implements IpcControl {
  private contextSubject: Subject<IpcEvent> = new Subject<IpcEvent>();
  private subcriptSubject: Subject<IpcEvent> = new Subject<IpcEvent>();
  private ws: WebSocket = null;
  private appName;
  private appInitialized = false;
  private SERVER_URL = "ws://localhost:8000";
  private isSocketOpen? : Promise<boolean>;
  private resolver: any = null;
  private isDisposed = false;
  private enableLocalHost: boolean;

  constructor(enableLocalHost: boolean) {
    this.enableLocalHost = enableLocalHost;
    this.init();
  }

  private init(): void {
      this.isSocketOpen = new Promise((resolve, reject) => {
        this.resolver = resolve
      })
      if(this.enableLocalHost) {
        this.SERVER_URL = "ws://localhost:8000"
      }
      this.ws = new WebSocket(this.SERVER_URL);
      this.ws.onerror = (e : WebSocket.ErrorEvent) => this.onError(e);
      this.ws.onmessage = (m : WebSocket.MessageEvent) => this.onMessage(m);
      this.ws.onclose = () => { this.reset(); if(!this.isDisposed) { setTimeout(() => this.init() ,200)}}
      this.ws.onerror = (e : WebSocket.Event) => this.onOpen(e);
  }

  getWS(): WebSocket {
    return this.ws;
  }
  setAppName(appName: string): void {
    this.appName = appName
  }
  getAppName(): string {
    return this.appName
  }
  onError(e : WebSocket.ErrorEvent) {
    this.reset();
  }
  onOpen(e : WebSocket.Event) {
    this.resolver && this.resolver(true);
    if(this.appName && !this.appInitialized) this.initialize(this.appName)
  }
  onMessage(m : WebSocket.MessageEvent) {
    let msgData = JSON.parse(m.data);
    let eventType = msgData.type;
    let key = msgData.keyboard
    let data
    try {
      data = JSON.stringify(msgData.data)
    } catch(e) {
      data =  msgData.data
    }
    if(eventType == 'publishedEvent' || eventType == 'contextChange') {
        this.subcriptSubject.next({'name' : key, 'value' : data})
    } else if(eventType == 'getValueReturn') {
      this.contextSubject.next({'name' : key, 'value' : data})
    }
  }


  dispose() : void {
    this.isDisposed = true;
    this.contextSubject.complete();
    this.subcriptSubject.complete();
    this.closeSocket();
  }

  initialize(appName: string): void {
    if( typeof(appName) === 'undefined' || appName == null || appName == '')
      throw 'Appname required'
    this.appName = appName;
    let sa = appName.split(';')
    if(this.appInitialized == false) {
      const data = {clientSessionId : sa.length > 1 ? sa[1] : null};
      this.send('initialize', sa[0], sa.length > 1 ? data : null);
      this.appInitialized = true
    }
  }
  publish(name: string , value : any ): void {
    this.send('publish',name, JSON.stringify(value))
  }
  subscribe(name : string): Observable<any> {
    return this.subcriptSubject.asObservable().pipe(filter((m: IpcEvent) =>  m.name === name )).pipe(map((m: IpcEvent) => m.value));
  }
  setContext(context: DFContext): void {
    this.send('set', context.key, JSON.stringify(context))
  }

  getContext(name: string): Observable<any> {
    let result = this.contextSubject.asObservable().pipe(filter((m: IpcEvent) =>  m.name === name )).pipe(map((m: IpcEvent) => m.value));
    this.send('get',name , null);
    return Observable.create( o => {
      let sub =  result.subscribe(d => {
        o.next(d);
        o.complete();
        sub.unsubscribe();
      },e  => {
        o.error(e);
        o.complete();
        sub.unsubscribe();
      }
      )
    })
  }
  navigateTo(options: DFOptions, queryPair: DFNavigatorQueryPair[]): void {
    this.naviGateHelper(options,queryPair,false)
  }
  navigateToContainer(options: DFOptions, queryPair: DFNavigatorQueryPair[]): void {
    this.naviGateHelper(options,queryPair,true)
  }
  naviGateHelper(options : DFOptions ,queryPairs : DFNavigatorQueryPair[], navigateToContainer : boolean): void {
    var appId = options.appId || '';
    var containerId = options.containerId || '';
    var title = options.title || '';
    var qsCollection: any[] = []
    if(queryPairs) {
      for(var i =0; i < queryPairs.length; i++) {
          var queryString : DFNavigatorQueryPair = queryPairs[i]
          if(queryString.name || '') {
            qsCollection.push(queryString)
          }
      }
    }
    if(navigateToContainer) {
      this.send('navigateToContainer',appId, {
        qsCollection : qsCollection,
        title : title,
        containerId : containerId
      })
    }else {
      this.send('navigateTo',appId, {
        qsCollection : qsCollection,
        title : title,
      })
    }
  }
  private reset(): void {
    if(this.resolver) this.resolver(false);
    this.isSocketOpen = undefined;
    this.resolver = null;
    this.closeSocket()
  }
  private closeSocket(): void {
    let ws = this.ws;
    if(ws && ws.readyState == WebSocket.OPEN){
      ws.close();
    }
    this.ws = null;
    this.appInitialized = false;
  }
  private sentToServer(message): void {
    let ws = this.ws;
    if(ws && ws.readyState == WebSocket.OPEN){
      ws.send(message);
    }else {
      console.error(`Error: Unable to send the message because socket wasn't ready. State was ${ws.readyState}`)
    }

  }
  private send(type: string, key: string, data: any) {
    this.isSocketOpen && this.isSocketOpen.then((r) => {
      if(r){
        this.sentToServer(JSON.stringify({
          type: type,
          key: key,
          data:data
        }))
      }
    })
  }
}
