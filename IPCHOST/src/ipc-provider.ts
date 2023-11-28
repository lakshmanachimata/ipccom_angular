import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http'
import { Logger } from './ipc-logger';
import { App, LoadType, JsonType, Context, Event, Provider, AppConfig, ProviderLoader, eventType } from './ipc-enums';
const cwd = process.env.ipcCWD || process.cwd()


/**
 * primary validation of json will be done here more can be added later
 * @param appConfig
 * @returns
 */
const validateAppsConfig = (appConfig : App[], ipcLogger : Logger): boolean =>
{
  if(!appConfig) {
    return false;
  }
  let valid : boolean = true
  let appdups : any[] = [];
  let aitdupes : any[] = [];
  if(appConfig.length) {
    for(let  ai = 0; ai < appConfig.length; ai++) {
      for(let aj = ai + 1; aj < appConfig.length; aj++) {
        if(appConfig[ai].appId == appConfig[aj].appId) {
          appdups.push({key : ai, value :  appConfig[ai].appId})
        }
        if(appConfig[ai].ait == appConfig[aj].ait) {
          aitdupes.push({key : ai, value :  appConfig[ai].ait})
        }
      }
    }
    /*
    if(aitdupes.length) {
      for (var eai = 0;  eai < aitdupes.length; eai++ ) {
        ipcLogger.info(` duplicate ait ${aitdupes[eai].value} found at position ${aitdupes[eai].key+1}  for the ${aitdupes[eai].app}`)
      }
    }
    */
    if(appdups.length) {
      for (var dai = 0;  dai < appdups.length; dai++ ) {
        ipcLogger.info(` duplicate app ${appdups[dai].value} found at position ${appdups[dai].key+1}  `)
      }
    }
  }
 return valid
}

/**
 * primary validation of json will be done here more can be added later
 * @param appConfig
 * @returns
 */
const validateProvidersConfig = (appConfig : Provider[], ipcLogger : Logger): boolean =>
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
          if(appConfig[ai].events[ei].eventName == appConfig[ai].events[ej].eventName) {
            eventdups.push({key : ej, value : appConfig[ai].events[ej].eventName, app : appConfig[ai].provider})
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

const loadFileApps = (): App[]  => {
  const ipcApps : App[] = JSON.parse(fs.readFileSync(path.resolve(cwd,'../configuration/applications.json'), 'utf-8'))
  return ipcApps ? ipcApps : []
}
const loadFileProviders = (): Provider[]  => {
  const ipcProviders : Provider[] = JSON.parse(fs.readFileSync(path.resolve(cwd,'../configuration/application-event-context-subscriber-mapping.json'), 'utf-8'))
  return ipcProviders ? ipcProviders : []
}

const loadFileAppConfigs = () : AppConfig => {
  const apps : App[] = loadFileApps()
  const providers: Provider[] = loadFileProviders()
  const appConfig: AppConfig = {apps, providers}
  return appConfig as AppConfig
}

class LocalProviderLoader implements ProviderLoader {
  ipcLogger : Logger;
  providerValidator : ProviderValidator
  constructor( logger : Logger, providerValidator : ProviderValidator) {
    this.ipcLogger = logger;
    this.providerValidator = providerValidator
  }
  public async load(): Promise<AppConfig> {
      return Promise.resolve(loadFileAppConfigs())
  }
  public validateProviderConfig(providers : Provider[]) {
    return validateProvidersConfig(providers,this.ipcLogger)
  }
  public validateAppConfig(apps : App[]) {
    return validateAppsConfig(apps,this.ipcLogger)
  }
}

const loadRemoteJson = async (ipcLogger: Logger,jsonType: JsonType): Promise<any> => {
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
        ipcLogger.error(`provider json loading from remote failed with error ${e.message}`);
        if(jsonType == JsonType.app){
          return resolve(loadFileApps())
        }else if(jsonType == JsonType.provider) {
          return resolve(loadFileProviders())
        }
      });
    } catch (e: any) {
      ipcLogger.error(`provider json loading from remote failed with error ${e.message}`)
      if(jsonType == JsonType.app){
        return resolve(loadFileApps())
      }else if(jsonType == JsonType.provider) {
        return resolve(loadFileProviders())
      }
    }
  })
}

class RemoteProviderLoader implements ProviderLoader {
  ipcLogger : Logger;
  providerValidator : ProviderValidator
  constructor( logger : Logger,providerValidator : ProviderValidator) {
    this.ipcLogger = logger;
    this.providerValidator = providerValidator
  }
  public async load(): Promise<AppConfig> {
    return new Promise( async (resolve, reject) => {
      try {
        let apps: App[] = await loadRemoteJson(this.ipcLogger,JsonType.app)
        let providers: Provider[] = await loadRemoteJson(this.ipcLogger,JsonType.provider)
        resolve({apps,providers})
      }catch(e: any){
        const error = e as Error;
        this.ipcLogger.error(`provider json loading from remote failed with error ${error.message}`)
        resolve(loadFileAppConfigs())
      }
    })
  }
  public validateProviderConfig(providers : Provider[]) {
    return validateProvidersConfig(providers,this.ipcLogger)
  }
  public validateAppConfig(apps : App[]) {
    return validateAppsConfig(apps,this.ipcLogger)
  }
}

export class ProviderValidator  {
  ipcLogger : Logger
  constructor( logger : Logger) {
    this.ipcLogger = logger;
  }

  public getMembersOfApplicationId(providers: Provider[], appName: string, memberType: string, memberTypeName: string): String[] {
    let members: any = [];
    for(let  ai = 0; ai < providers.length; ai++) {
      if(providers[ai].provider == appName) {
        if(memberType == eventType.publishedEvent) {
          members = providers[ai].events;
        }else if(memberType == eventType.contextChangeEvent) {
          members = providers[ai].contexts;
        }else {
          return []
        }
        for(let ei = 0; ei < members.length; ei++){
          if (members[ei].eventName === memberTypeName){
            return members[ei].members
          }else if (members[ei].contextName === memberTypeName){
            return members[ei].members
          }
        }
      }
    }
    return []
  }

  public checkIfAppNameAllowed(apps: App[],appName: string): boolean {
    if(apps.length) {
      for(let  ai = 0; ai < apps.length; ai++) {
        if(appName == apps[ai].appId){
          return true;
        }
      }
    }else {
      return true;
    }
    return false;
  }

  public validateConfigForTheApp(providers: Provider[],appName: string, memberType: string, memberTypeName: string): boolean {
    const members = this.getMembersOfApplicationId(providers,appName,memberType,memberTypeName)
    if(!members.length) return false;
    return true
  }

}



