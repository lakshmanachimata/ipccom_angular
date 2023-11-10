import { DFContext } from './ipc.interface';
import * as WebSocket from 'ws'
import { IpcControlImpl } from './ipc.controls';



class DFContextImpl implements DFContext {
  key: string
  value: string;
  child?: DFContext[] | undefined;
}
const initApp = async(cmgargs) => {
  console.log("initApp  called  " + cmgargs[2])
  let ipcCtrl = new IpcControlImpl(true)
  ipcCtrl.setAppName(cmgargs[2])
  if(ipcCtrl.getWS()) {
    {
      setTimeout(async ()  => {
        if(ipcCtrl.getWS() && ipcCtrl.getWS().readyState == WebSocket.OPEN){
          if(cmgargs[2] == 'app1;111'){
            let dfContext = new DFContextImpl()
            dfContext.key = 'ctxkey'
            dfContext.value = 'ctxval'
            ipcCtrl.publish( 'test3', 'testval')
          }
          setTimeout(async () => {
            let ctxVal$ =  ipcCtrl.getContext('ctxkey')
            ctxVal$.subscribe((data) => console.log("get CTX " + JSON.stringify(data)))
          },100)
          console.log("initApp  Websocket opened " + ipcCtrl.getAppName() + "  " + ipcCtrl.getWS().readyState)
        }else {
          console.log("WebSocket is not yet ready " + ipcCtrl.getAppName())
        }
    } ,1000)}
  }
}
var cmgargs = process.argv ;
initApp(cmgargs)
// initApp('app1;111')

// initApp('app2;112')

// initApp('app2;113')
