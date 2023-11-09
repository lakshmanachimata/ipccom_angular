import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http'
import { Logger } from './ipc-logger';
const cwd = process.env.ipcCWD || process.cwd()




const enum LoadType {
  local = 'local',
  remote = "remote",
}

export interface Event {
  eventname: String
  subsribers: String[]
}

export interface Provider {
  provider : String,
  events : Event[]
}
export interface ProviderLoader {
  load(): Promise<Provider[]>;
  validateProviderConfig(providers : Provider[]): boolean
}




/**
 * primary validation of json will be done here more can be added later
 * @param appConfig
 * @returns
 */
const validateAppConfig = (appConfig : Provider[], ipcLogger : Logger): boolean =>
{
  if(!appConfig) {
    return false;
  }
  let valid : boolean = true
  let appdups : any[] = [];
  let eventdups : any[] = [];
  if(appConfig.length) {
    for(let  ai = 0; ai < appConfig.length; ai++) {
      for(let aj = ai + 1; aj < appConfig.length; aj++) {
        if(appConfig[ai].provider == appConfig[aj].provider) {
          appdups.push({key : ai, value :  appConfig[ai].provider})
        }
      }
      for(let  ei = 0; ei < appConfig[ai].events.length; ei++) {
        for(let ej = ei + 1; ej < appConfig[ai].events.length; ej++) {
          if(appConfig[ai].events[ei].eventname == appConfig[ai].events[ej].eventname) {
            eventdups.push({key : ej, value : appConfig[ai].events[ej].eventname, app : appConfig[ai].provider})
          }
        }
      }
    }
    if(eventdups.length) {
      for (var eai = 0;  eai < eventdups.length; eai++ ) {
        ipcLogger.info(` duplicate provider ${eventdups[eai].value} found at position ${eventdups[eai].key+1}  for the ${eventdups[eai].app}`)
      }
    }
    if(appdups.length) {
      for (var dai = 0;  dai < appdups.length; dai++ ) {
        ipcLogger.info(` duplicate provider ${appdups[dai].value} found at position ${appdups[dai].key+1}  `)
      }
    }
  }
 return valid
}

export const ProviderLoaderFactory = (loadType : String, logger : Logger) : ProviderLoader  => {
  let prooviderLoader : ProviderLoader;
  const providerValidator = new ProviderValidator(logger)
  switch(loadType) {
    case  LoadType.remote:
      prooviderLoader = new RemoteProviderLoader(logger, providerValidator );
    case LoadType.local:
      prooviderLoader = new LocalProviderLoader(logger,providerValidator);
    default :
      prooviderLoader = new LocalProviderLoader(logger,providerValidator);
    return prooviderLoader;
  }
}

const loadFileProvider = (): Provider[]  => {
  const ipcAppConfig : Provider[] = JSON.parse(fs.readFileSync(path.resolve(cwd,'../configuration/providers.json'), 'utf-8'))
  return ipcAppConfig ? ipcAppConfig : []
}

class LocalProviderLoader implements ProviderLoader {
  ipcLogger : Logger;
  providerValidator : ProviderValidator
  constructor( logger : Logger, providerValidator : ProviderValidator) {
    this.ipcLogger = logger;
    this.providerValidator = providerValidator
  }
  public async load(): Promise<Provider[]> {
      return Promise.resolve(loadFileProvider())
  }
  public validateProviderConfig(providers : Provider[]) {
    return validateAppConfig(providers,this.ipcLogger)
  }
}

class RemoteProviderLoader implements ProviderLoader {
  ipcLogger : Logger;
  providerValidator : ProviderValidator
  constructor( logger : Logger,providerValidator : ProviderValidator) {
    this.ipcLogger = logger;
    this.providerValidator = providerValidator
  }
  public async load(): Promise<Provider[]> {
    return new Promise((resolve, reject) => {
      try {
        var options = {
          host: 'localhost',
          port:4000,
          path: ''
        };
        var req = http.get(options, function(res) {
          let rawData = '';
          res.on('data', function(chunk) {
            rawData += chunk;
          }).on('end', function() {
            var body = JSON.parse(rawData)
            resolve(body)
          })
        });

        req.on('error', (e) => {
          this.ipcLogger.error(`provider json loading from remote failed with error ${e.message}`)
          resolve(loadFileProvider())
        });
      }catch(e){
        this.ipcLogger.error(`provider json loading from remote failed with error ${e.message}`)
        resolve(loadFileProvider())
      }
    })
  }
  public validateProviderConfig(providers : Provider[]) {
    return validateAppConfig(providers,this.ipcLogger)
  }
}

export class ProviderValidator  {
  ipcLogger : Logger
  constructor( logger : Logger) {
    this.ipcLogger = logger;
  }
  public getSubscribersOfAppEvent(providers: Provider[],appName: string , eventName): String[] {
    for(let  ai = 0; ai < providers.length; ai++) {
      if(providers[ai].provider == appName) {
        for(let ei = 0; ei < providers[ai].events.length; ei++){
          if (providers[ai].events[ei].eventname === eventName){
            return providers[ai].events[ei].subsribers
          }
        }
      }
    }
    return []
  }

  public getEventsOfAppName(providers: Provider[],appName: string): Event[] {
    for(let  ai = 0; ai < providers.length; ai++) {
      if(providers[ai].provider == appName) {
        return providers[ai].events
      }
    }
    return []
  }
  // private validateEventConfigForTheApp(appName: string, eventName: string): boolean {
  //   console.log(`validateEventConfigForTheApp with ${appName} and ${eventName}`)
  //   const eventNames = this.getEventsOfAppName(appName)
  //   // console.log(`validateEventConfigForTheApp eventNames ${JSON.stringify(eventNames)}`)
  //   if(!eventNames.length) return false;
  //   for(let ei = 0;  ei < eventNames.length; ei++) {
  //     if(eventName == eventNames[ei].eventname) return true
  //   }
  //   return false
  // }
  public checkIfAppNameAllowed(providers: Provider[],appName: string): boolean {
    if(providers.length) {
      for(let  ai = 0; ai < providers.length; ai++) {
        if(appName == providers[ai].provider){
          return true;
        }
      }
    }else {
      return true;
    }
    return false;
  }
  public validateEventConfigForTheAppInPublish(providers: Provider[],appName: string, eventName: string): boolean {
    console.log(`validateEventConfigForTheAppInPublish with ${appName} and ${eventName}`)
    const eventNames = this.getEventsOfAppName(providers,appName)
    console.log(`validateEventConfigForTheApp eventNames ${JSON.stringify(eventNames)}`)
    if(!eventNames.length) return false;
    for(let ei = 0;  ei < eventNames.length; ei++) {
      if(eventName == eventNames[ei].eventname) return true
    }
    return false
  }
}



