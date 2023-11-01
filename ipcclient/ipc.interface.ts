import { Observable } from 'rxjs';

export interface IpcEvent {
  name: string,
  value: any
}

export interface DFNavigatorQueryPair {
  name: string,
  value: string
}

export interface DFOptions {
 appId: string,
 title: string,
 containerId: string
}

export interface DFContext {
  key: string,
  value: string,
  child?: DFContext[]
}

export interface IpcControl {

  dispose(): void;

  navigateTo(options: DFOptions, queryPair: DFNavigatorQueryPair[]): void;
  navigateToContainer(options: DFOptions, queryPair: DFNavigatorQueryPair[]): void;

  getContext(key: string): Observable<any>;
  setContext(context: DFContext): any;

  publish(eventName: string,eventData: string | Object): void;
  subscribe(eventName: string): Observable<any>;
}
