import { Component } from '@angular/core';
import * as http from "http"
import { WebSocket } from 'ws';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private server : any
  private ipcHost : WebSocket
  title = 'ipcserver';
  constructor() {
    this.server  = http.createServer()
    this.ipcHost = new WebSocket.Server({server : this.server})
    this.ipcHost.addListener('connection',this.onConnection)
    this.server.listen(4567)
  }

  onConnection(ws:WebSocket, req : http.IncomingMessage) {
    if(!(ws) || !(req)) {
      console.log("Ws or req is null")
    }
    ws.on('message',(message : any) => {
      console.log("ipchost message " + message)
    })
    ws.on('close',() => {

    })
  }

  start() : Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        this.ipcHost.on('connection',(ws:WebSocket, req:http.IncomingMessage) => {
          if(!(ws) || !(req)) {
            console.log("Ws or req is null")
          }
          ws.on('message',(message : any) => {
            console.log("ipchost message " + message)
          })
          ws.on('close',() => {

          })
          resolve(0)
        });
      }catch(e) {
        console.log("ipc host callbacks error" + e)
      }
      })

  }
}
