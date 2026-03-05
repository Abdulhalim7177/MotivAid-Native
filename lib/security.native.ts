import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const OFFLINE_CRED_KEY = 'motivaid_offline_creds';

export const checkBiometrics = async () => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
};

export const authenticateBiometric = async () => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Login to MotivAid',
      fallbackLabel: 'Use Password',
    });
    return result.success;
  } catch {
    return false;
  }
};

export const saveOfflineCredentials = async (email: string, password: string) => {
  // We store a hash of the password + email for offline verification
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    email.toLowerCase() + password
  );
  
  const data = JSON.stringify({ email: email.toLowerCase(), hash });
  await SecureStore.setItemAsync(OFFLINE_CRED_KEY, data);
};

export const verifyOfflineCredentials = async (email: string, password: string) => {
  try {
    const stored = await SecureStore.getItemAsync(OFFLINE_CRED_KEY);
    if (!stored) return false;

    const { email: storedEmail, hash: storedHash } = JSON.parse(stored);

    const currentHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      email.toLowerCase() + password
    );

    return email.toLowerCase() === storedEmail && currentHash === storedHash;
  } catch {
    return false;
  }
};

export const deleteOfflineCredentials = async () => {
  try {
    await SecureStore.deleteItemAsync(OFFLINE_CRED_KEY);
  } catch {
    // Silently fail if key doesn't exist
  }
};

export const getSavedEmail = async () => {
  try {
    const stored = await SecureStore.getItemAsync(OFFLINE_CRED_KEY);
    if (!stored) return null;
    return JSON.parse(stored).email;
  } catch {
    return null;
  }
};
