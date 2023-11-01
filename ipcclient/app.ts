import { IpcControlImpl } from './ipc.controls';
import { IpcControl } from './ipc.interface';
import * as WebSocket from 'ws'



const initApp = async() => {
  console.log("initApp  called")
  let ipcCtrl = new IpcControlImpl(true)
  ipcCtrl.setAppName('app111;1111')
  if(ipcCtrl.getWS()) {
    {
      setTimeout(() => {
        if(ipcCtrl.getWS() && ipcCtrl.getWS().readyState == WebSocket.OPEN){
          console.log("initApp  Websocket opened " + ipcCtrl.getAppName() + "  " + ipcCtrl.getWS().readyState)
        }else {
          console.log("WebSocket is not yet ready " + ipcCtrl.getAppName())
        }
    } ,1000)}
  }
}
initApp()
