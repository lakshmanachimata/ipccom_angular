
export interface App {
    appId: String,
    ait: String
  }
  
  export const enum LoadType {
    local = 'local',
    remote = "remote",
  }
  
  export const enum JsonType {
    app = 'app',
    provider = "provider",
  }
  
  export interface Context {
    contextName: String
    members: String[]
  }
  
  export interface Event {
    eventName: String
    members: String[]
  }
  
  export interface Provider {
    provider : String,
    events : Event[]
    contexts : Context[]
  }
  
  export interface AppConfig {
    apps: App[]
    providers: Provider[]
  }
  
  export interface ProviderLoader {
    load(): Promise< AppConfig >;
    validateProviderConfig(providers : Provider[]): boolean
    validateAppConfig(apps : App[]): boolean
  }
  