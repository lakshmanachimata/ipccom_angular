
export interface App {
    appId: String,
    ait: String
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
    provider: String,
    events: Event[]
    contexts: Context[]
}

export interface AppConfig {
    apps: App[]
    providers: Provider[]
}

export interface ProviderLoader {
    load(): Promise<AppConfig>;
    validateProviderConfig(providers: Provider[]): boolean
    validateAppConfig(apps: App[]): boolean
}


const enum LoadType {
    local = 'local',
    remote = "remote",
}

const enum JsonType {
    app = 'app',
    provider = "provider",
}

const enum logType {
    error = 'error',
    info = 'info',
    log = 'log'
}
const enum eventType {
    contextChangeEvent = 'contextChange',
    publishedEvent = 'publishedEvent',
    navigateEvent = 'navigateEvent',
    contextGetEvent = 'getValueReturn',
    initializeResponse = 'initializeResponse'
}

export { LoadType, JsonType, eventType, logType};
