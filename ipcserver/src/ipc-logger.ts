import { Subject, Subscription, Observable } from "rxjs";
import { inspect } from 'util'
import * as os from 'os'
import * as fs from 'fs'
import { WriteStream } from 'tty'


/**
 * Logger interface
 */
export interface Logger {
  info(message : LogEntry | string ) : void
  error(message : LogEntry | string ) : void
  log(message : LogEntry | string ) : void
  dumpData(...data: any) : void
}
/**
 * Logger Entry
 */
export  interface LogEntry {
  message : string;
  cb? : Function;
}

export interface LogConfig {
  fileName: string;
  fileMaxSize: string;
  filePath: string;
}
const enum logType {
  error = 'Error',
  info = "Info",
  log = "Log",
}

export class LoggerBase extends Observable<LogEntry> implements Logger {
  protected readonly _subject : Subject<LogEntry> = new Subject<LogEntry>();
  private _ob = Observable<LogEntry>
  private logLevel: String;
  private logType: logType = logType.log;
  private logData: boolean;

  constructor(logLevel: String , logData : boolean) {
    super()
    this._ob = this._subject.asObservable()
    //default loglevel error
    this.logLevel = (logLevel === "info" || logLevel === "error") ? logLevel.toLowerCase() : 'error'
    this.logData = logData
  }
  private write(message : LogEntry | string ) : void {
    const value = `${this.logType ? this.logType : logType.log} : ${ (typeof message === 'object')? (typeof message.message === 'object') ? inspect(message.message) : message.message : message }`
    const logMessge = typeof(message) === 'string' ? {message : value, cb: null} : { message : value,  cb : ( !message.cb && message.cb === undefined) ? null : message.cb}
    this._subject.next(logMessge as LogEntry)
  }
  log(message: string | LogEntry): void {
    this.logType = logType.log;
    this.write(message)
  }
  info(message: string | LogEntry): void {
    if(this.logLevel == 'info') {
      this.logType = logType.log;
      this.write(message)
    }
  }
  error(message: string | LogEntry): void {
    this.logLevel = 'error'
    this.write(message)
  }

  dumpData(...data: any): void {
    if(this.logData == true && this.logLevel == 'info') {
      this.logType == logType.info
      const payLoad = {...data}
      let payLoadStr;
      try {
        payLoadStr = JSON.stringify(payLoad)
      } catch(e) { payLoadStr = `An error occured while parsing logger data. Details: ${e.message}` }
      const message = {message : payLoadStr}
      this.write(message)
    }
  }
};

/**
 * Consolelogger provdider class
 */
export class ConsoleLogger extends LoggerBase {
  private subscription?;
  constructor( logLevel : string, logData : boolean) {
    try {
      super(logLevel,logData);
      this.subscription = this._subject.subscribe((entry : LogEntry) => {
        let console = process.stdout;
        console.write(entry.message + '\n')
        if(entry.cb && typeof(entry.cb) === 'function') entry.cb()
      })
    }catch(e) {
      if(this.subscription) {
        this.subscription.unsubscribe()
      }
      throw e
    }

  }
}

/**
 * File provdider class
 */

export class FileLogger extends LoggerBase {
  private fileToWrite: string;
  private outStream?;
  private logFileName: string;
  private subscription?;
  constructor(logConfig : LogConfig, logLevel : String, logData : boolean) {
    if(!logConfig) throw new Error("Log configuration is missing.Can't continue with ETP Logger setup")
    try {
      super(logLevel, logData)
      this.logFileName = logConfig.fileName
      this.fileToWrite = `${logConfig.filePath ? logConfig.filePath : os.tmpdir()}\\${this.generateUUID()}.log`
      this.outStream = fs.createWriteStream(this.fileToWrite)
      this.subscription = this._subject.subscribe((entry : LogEntry) => {
        const dateAndTime = new Date().toLocaleString('en-US',{year : 'numeric', month : 'numeric', day : 'numeric', hour : 'numeric', minute : 'numeric', second : 'numeric'})
        this.outStream?.write(dateAndTime + '\t' + entry.message + '\r\n')
        if(entry.cb && typeof(entry.cb) === 'function') entry.cb()
      }, (error) => {
        this.outStream?.end()
        this.outStream?.close()
      }, () => {
        this.outStream?.end()
        this.outStream?.close()
      })
    }catch(e) {
      if(this.outStream)
        delete this.outStream
      if(this.subscription)
        this.subscription.unsubscribe()
      throw e;
    }
  }
  set logFile(value : string) {
    if(!value)
      throw new Error("log File Name cannot be empty")
    this.logFileName = value;
  }
  private generateUUID(): string {
    let date = new Date().getTime()
    return this.logFileName + date;
  }
}

export const loggerFactory = (ipcConfig : any) : Logger  => {
  if(!ipcConfig) console.error('ETP-IPCHost configuration missing. Unable to start')
  const logConfigInfo: LogConfig = ipcConfig.loggerProviderProperties;
  const provider : string = ipcConfig.loggerProvider;
  const logLevel : string = ipcConfig.logLevel;
  const logData : boolean = ipcConfig.logData;
  let logger : Logger;
  switch(provider) {
    case 'console':
      logger = new ConsoleLogger(logLevel,logData);
      break;
    case 'file':
      logger = new FileLogger(logConfigInfo, logLevel, logData)
      break;
    default :
    logger = new ConsoleLogger(logLevel,logData);
    break;
  }
  return logger;
}

