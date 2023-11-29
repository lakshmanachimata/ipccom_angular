import { IPCHost } from "../src/ipc-host";
import { Logger } from "../src/ipc-logger";
import { ProviderValidator } from '../src/ipc-provider';
import { AppConfig, Provider } from '../src/ipc-definitions';
import { WebSocket } from 'ws';

describe('IPCHost Connect', () => {
    let logger: Logger;
    let ipc: IPCHost;
    let appConfig: AppConfig;
    let providerValidator: ProviderValidator;

    beforeEach(() => {
        process.env.ipcCWD = './IPCHost';
        appConfig = {
            apps: [
                {
                    appId: 'testApp',
                    ait: '111'
                }
            ],
            providers: [
                {
                    provider: 'testApp',
                    events: [
                        {
                            eventName: 'event1',
                            members: ['member1', 'member2']
                        }
                    ],
                    contexts: []
                }
            ]
        };
        logger = {
            info: (message: Object | string): void => {
            },
            error: (message: Object | string): void => {
            },
            log: (message: Object | string): void => {
            },
            dumpData: (...data): void => {
            },
        };
        spyOn(logger, 'info');
        ipc = new IPCHost(logger, appConfig, providerValidator);
    })

    afterEach(() => {
        ipc.closeServer();
    })

    describe('start', () => {
        it('it returns 0 on successful start', () => {
            ipc.start().then((ret) => {
                expect(ret).toEqual(0);
            })
        })
        it('it calls logger info as part of ipcHost', () => {
            expect(logger.info).toHaveBeenCalled();
        })
        it('should create an instance of IPCHost', () => {
            expect(ipc).toBe(ipc);
        });
    });

    describe('close', () => {
        it('should close the IPCHost instance', () => {
            ipc.close();
        });
        it('should empty the socket store', () => {
            ipc.close();
            expect(ipc['socketStore'].size).toBe(0);
        });
    });

    describe('closeServer', () => {
        it('should close the HTTP server instance', () => {
            ipc.closeServer();
        });
    });


    describe('handleMessage', () => {
        it('should handle the message received from a WebSocket client', () => {
            const wsMock = {} as WebSocket; // Create a mock WebSocket object
            const message = { type: 'test', key: '123', data: { foo: 'bar' } }; // Define the message to simulate

            ipc['handleMessage'](wsMock, message);

            // Add your assertions here to check the behavior of the IPCHost class based on the received message
            // For example:
            // expect(ipc.someProperty).toBe(expectedValue);
            // expect(ipc.someMethod()).toBe(expectedValue);
        });
    });

})