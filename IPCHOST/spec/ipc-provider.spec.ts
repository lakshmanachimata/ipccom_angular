import { ProviderValidator } from '../src/ipc-provider';
import { Logger } from "../src/ipc-logger";
import { App, Provider } from '../src/ipc-definitions';

describe('ProviderValidator', () => {
  let providerValidator: ProviderValidator;
  let logger: Logger;

  beforeEach(() => {
    providerValidator = new ProviderValidator(logger);
  });

  describe('getMembersOfApplicationId', () => {
    it('should return an empty array if no matching provider for event is found', () => {
      const providers: Provider[] = [];
      const appName = 'nonexistentApp';
      const memberType = 'publishedEvent';
      const memberTypeName = 'eventName';

      const result = providerValidator.getMembersOfApplicationId(providers, appName, memberType, memberTypeName);

      expect(result).toEqual([]);
    });
    it('should return an empty array if no matching provider for setContext is found', () => {
      const providers: Provider[] = [];
      const appName = 'nonexistentApp';
      const memberType = 'contextChange';
      const memberTypeName = 'contextName';

      const result = providerValidator.getMembersOfApplicationId(providers, appName, memberType, memberTypeName);

      expect(result).toEqual([]);
    });
    it('should return an empty array if no matching provider for getContext is found', () => {
      const providers: Provider[] = [];
      const appName = 'nonexistentApp';
      const memberType = 'getValueReturn';
      const memberTypeName = 'contextName';

      const result = providerValidator.getMembersOfApplicationId(providers, appName, memberType, memberTypeName);

      expect(result).toEqual([]);
    });
    const providers: Provider[] = [{
      provider: 'myApp',
      events: [{
          eventName: 'event1',
          members: ['member1', 'member2']
        }],
      contexts: [{
        contextName: 'context1',
        members: ['member1', 'member2']
      }]
    }];
    it('should return the members array if matching provider provider for event are found', () => {
      const appName = 'myApp';
      const memberType = 'publishedEvent';
      const memberTypeName = 'event1';

      const result = providerValidator.getMembersOfApplicationId(providers, appName, memberType, memberTypeName);

      expect(result).toEqual(['member1', 'member2']);
    });
    it('should return the members array if matching provider for setcontext are found', () => {
      const appName = 'myApp';
      const memberType = 'contextChange';
      const memberTypeName = 'context1';

      const result = providerValidator.getMembersOfApplicationId(providers, appName, memberType, memberTypeName);

      expect(result).toEqual(['member1', 'member2']);
    });
    it('should return the members array if matching provider for getcontext are found', () => {
      const appName = 'myApp';
      const memberType = 'getValueReturn';
      const memberTypeName = 'context1';

      const result = providerValidator.getMembersOfApplicationId(providers, appName, memberType, memberTypeName);

      expect(result).toEqual(['member1', 'member2']);
    });
    it('should return the empty members array if matching provider is not found for memberType', () => {
      const appName = 'myApp';
      const memberType = 'invalidMemberType';
      const memberTypeName = 'context1';

      const result = providerValidator.getMembersOfApplicationId(providers, appName, memberType, memberTypeName);

      expect(result).toEqual([]);
    });
  });

  describe('checkIfAppNameAllowed', () => {
    it('should return true if the app name is allowed', () => {
      const apps: App[] = [{
          "appId": "allowedApp",
          "ait": "111"
        }];
      const appName = 'allowedApp';

      const result = providerValidator.checkIfAppNameAllowed(apps, appName);

      expect(result).toBe(true);
    });

    it('should return true if the allowed apps are empty', () => {
      const apps: App[] = [];
      const appName = 'allowedApp';

      const result = providerValidator.checkIfAppNameAllowed(apps, appName);

      expect(result).toBe(true);
    });

    it('should return false if the app name is not allowed', () => {
      const apps: App[] = [{
        "appId": "allowedApp",
        "ait": "111"
      }];
      const appName = 'nonexistentApp';

      const result = providerValidator.checkIfAppNameAllowed(apps, appName);

      expect(result).toBe(false);
    });
  });

  describe('validateConfigForTheApp', () => {
    it('should return false if no members are found for the given app and member type', () => {
      const providers: Provider[] = [];
      const appName = 'myApp';
      const memberType = 'publishedEvent';
      const memberTypeName = 'event1';

      const result = providerValidator.validateConfigForTheApp(providers, appName, memberType, memberTypeName);

      expect(result).toBe(false);
    });

    it('should return true if members are found for the given app and member type', () => {
      const providers: Provider[] = [{
        provider: 'myApp',
        events: [{
            eventName: 'event1',
            members: ['member1', 'member2']
          }],
        contexts: []
      }];
      const appName = 'myApp';
      const memberType = 'publishedEvent';
      const memberTypeName = 'event1';

      const result = providerValidator.validateConfigForTheApp(providers, appName, memberType, memberTypeName);

      expect(result).toBe(true);
    });
  });
});