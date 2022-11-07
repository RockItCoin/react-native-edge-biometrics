import { NativeModules, Platform } from 'react-native';
import { asArray, asJSON, asObject, asOptional, asString } from 'cleaners';
import { makeReactNativeDisklet } from 'disklet';

const disklet = makeReactNativeDisklet();

/**
 * @deprecated The method should not be used
 */
export type BiometryType = 'FaceID' | 'TouchID' | false;

const asFingerprintFile = asJSON(
  asObject({
    enabledUsers: asOptional(asArray(asString), []),
    disabledUsers: asOptional(asArray(asString), []),
  })
);

type FingerprintFile = ReturnType<typeof asFingerprintFile>;

const LINKING_ERROR =
  `The package 'react-native-edge-biometrics' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const EdgeBiometrics = NativeModules.EdgeBiometrics
  ? NativeModules.EdgeBiometrics
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

/**
 * @deprecated The method should not be used
 */
function createKeyWithUsername(username: string) {
  return username + '___key_loginkey';
}

/**
 * @deprecated The method should not be used
 */
export async function isTouchEnabled(username: string): Promise<boolean> {
  const file = await loadFingerprintFile();
  const supported = await supportsTouchId();

  return supported && file.enabledUsers.includes(username);
}

/**
 * @deprecated The method should not be used
 */
export async function isTouchDisabled(username: string): Promise<boolean> {
  const file = await loadFingerprintFile();
  const supported = await supportsTouchId();

  return !supported || file.disabledUsers.includes(username);
}

/**
 * @deprecated The method should not be used
 */
export async function supportsTouchId(): Promise<boolean> {
  if (!EdgeBiometrics) {
    console.warn('EdgeBiometrics  is unavailable');
    return false;
  }
  const out = await EdgeBiometrics.supportsTouchId();
  return !!out;
}

/**
 * @deprecated The method should not be used
 */
export async function enableTouchId(account: any): Promise<void> {
  const file = await loadFingerprintFile();
  const supported = await supportsTouchId();
  if (!supported) throw new Error('TouchIdNotSupportedError');

  const { username, loginKey } = account;
  const loginKeyKey = createKeyWithUsername(username);
  await EdgeBiometrics.setKeychainString(loginKey, loginKeyKey);

  // Update the file:
  if (!file.enabledUsers.includes(username)) {
    file.enabledUsers = [...file.enabledUsers, username];
  }
  if (file.disabledUsers.includes(username)) {
    file.disabledUsers = file.disabledUsers.filter((item) => item !== username);
  }
  saveFingerprintFile(file);
}

/**
 * @deprecated The method should not be used
 */
export async function disableTouchId(account: any): Promise<void> {
  const file = await loadFingerprintFile();
  const supported = await supportsTouchId();
  if (!supported) return; // throw new Error('TouchIdNotSupportedError')

  const { username } = account;
  const loginKeyKey = createKeyWithUsername(username);
  await EdgeBiometrics.clearKeychain(loginKeyKey);

  // Update the file:
  if (!file.disabledUsers.includes(username)) {
    file.disabledUsers = [...file.disabledUsers, username];
  }
  if (file.enabledUsers.includes(username)) {
    file.enabledUsers = file.enabledUsers.filter((item) => item !== username);
  }
  await saveFingerprintFile(file);
}

/**
 * @deprecated The method should not be used
 */
export async function getSupportedBiometryType(): Promise<BiometryType> {
  try {
    const biometryType = await EdgeBiometrics.getSupportedBiometryType();
    switch (biometryType) {
      // Keep these as-is:
      case 'FaceID':
      case 'TouchID':
        return biometryType;

      // Android sends this one:
      case 'Fingerprint':
        return 'TouchID';

      // Translate anything truthy to 'TouchID':
      default:
        return biometryType ? 'TouchID' : false;
    }
  } catch (error) {
    console.log(error);
    return false;
  }
}

/**
 * @deprecated The method should not be used
 * @description Looks up the stored biometric secret for a user. Returns undefined if there is no secret, or if the user denies the request.
 */
export async function getLoginKey(
  username: string,
  promptString: string,
  fallbackString: string
): Promise<string | undefined | void> {
  const file = await loadFingerprintFile();
  const supported = await supportsTouchId();
  if (
    !supported ||
    !file.enabledUsers.includes(username) ||
    file.disabledUsers.includes(username)
  ) {
    return;
  }

  const loginKeyKey = createKeyWithUsername(username);
  if (Platform.OS === 'ios') {
    const loginKey = await EdgeBiometrics.getKeychainString(loginKeyKey);
    if (typeof loginKey !== 'string' || loginKey.length <= 10) {
      console.log('No valid loginKey for TouchID');
      return;
    }

    console.log('loginKey valid. Launching TouchID modal...');
    const success = await EdgeBiometrics.authenticateTouchID(
      promptString,
      fallbackString
    );
    if (success) return loginKey;
    console.log('Failed to authenticate TouchID');
  } else if (Platform.OS === 'android') {
    return EdgeBiometrics.getKeychainStringWithFingerprint(
      loginKeyKey,
      promptString
    ).catch((error: unknown) => console.log(error)); // showError?
  }
}

/**
 * @deprecated The method should not be used
 */
export async function loadFingerprintFile(): Promise<FingerprintFile> {
  try {
    const json = await disklet.getText('fingerprint.json');
    return asFingerprintFile(json);
  } catch (error) {
    return { enabledUsers: [], disabledUsers: [] };
  }
}

/**
 * @deprecated The method should not be used
 */
async function saveFingerprintFile(file: FingerprintFile): Promise<void> {
  const text = JSON.stringify(file);
  await disklet.setText('fingerprint.json', text);
}
