import {IPCHost} from "../src/ipc-host";
import {Logger} from "../src/ipc-logger";
import { ProviderValidator } from '../src/ipc-provider';
import { AppConfig, Provider } from '../src/ipc-enums';

describe('IPCHost Connect',()=>{
    let logger: Logger;
    let ipc: IPCHost;
    let appConfig: AppConfig;
    let providerValidator: ProviderValidator;

    beforeAll(()=>{
        process.env.ipcCWD = './IPCHost';
        logger = {
            info: (message: Object | string): void=>{
            },
            error: (message: Object | string): void=>{
            },
            log: (message: Object | string): void=>{
            },
            dumpData: (...data): void=>{
            },
        };
        spyOn(logger, 'info');
        ipc = new IPCHost(logger, appConfig, providerValidator);

    })

    afterAll(()=>{
        ipc.closeServer();
    })

    beforeAll(()=>{

    })

    beforeEach(()=>{
        
    })
    
    afterEach(()=>{
        
    })

    it('it calls logger info as part of ipcHost',()=>{
        expect(logger.info).toHaveBeenCalled();
    })
    
    it('it returns 0 on successful start',()=>{
        ipc.start().then((ret)=>{
            expect(ret).toEqual(0);
        })
    })

})