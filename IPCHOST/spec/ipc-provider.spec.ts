import { ProviderValidator } from '../src/ipc-provider';
import { Logger } from "../src/ipc-logger";
import { App, Provider } from '../src/ipc-enums';

describe('ProviderValidator', () => {
  let providerValidator: ProviderValidator;
  let logger: Logger;

  beforeEach(() => {
    providerValidator = new ProviderValidator(logger);
  });

  describe('getMembersOfApplicationId', () => {
    it('should return an empty array if no matching provider is found', () => {
      const providers: Provider[] = [];
      const appName = 'nonexistentApp';
      const memberType = 'publishedEvent';
      const memberTypeName = 'eventName';

      const result = providerValidator.getMembersOfApplicationId(providers, appName, memberType, memberTypeName);

      expect(result).toEqual([]);
    });

    it('should return the members array if matching provider and member type are found', () => {
      const providers: Provider[] = [
        {
          provider: 'myApp',
          events: [
            {
              eventName: 'event1',
              members: ['member1', 'member2']
            }
          ],
          contexts: []
        }
      ];
      const appName = 'myApp';
      const memberType = 'publishedEvent';
      const memberTypeName = 'event1';

      const result = providerValidator.getMembersOfApplicationId(providers, appName, memberType, memberTypeName);

      expect(result).toEqual(['member1', 'member2']);
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
      const providers: Provider[] = [
        {
          provider: 'myApp',
          events: [
            {
              eventName: 'event1',
              members: ['member1', 'member2']
            }
          ],
          contexts: []
        }
      ];
      const appName = 'myApp';
      const memberType = 'publishedEvent';
      const memberTypeName = 'event1';

      const result = providerValidator.validateConfigForTheApp(providers, appName, memberType, memberTypeName);

      expect(result).toBe(true);
    });
  });
});