import { IpcControlImpl } from './ipc.controls';
import { IpcControl } from './ipc.interface';



const initApp = async() => {
  console.log("initApp  called")
  let IpcControl = new IpcControlImpl(true)
}
initApp()
