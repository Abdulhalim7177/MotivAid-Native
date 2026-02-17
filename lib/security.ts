import * as Crypto from 'expo-crypto';

const OFFLINE_CRED_KEY = 'motivaid_offline_creds';

import * as LocalAuthentication from 'expo-local-authentication';

export const checkBiometrics = async () => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    // For UI testing purposes, we return true if hardware exists, even if not enrolled, 
    // so the button is visible (it will prompt to enroll if clicked).
    // Or we can just check hasHardware && isEnrolled. 
    // Given the user report, let's return true if hardware exists so they see the button.
    return hasHardware;
  } catch (e) {
    return false;
  }
};

export const authenticateBiometric = async () => {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Login with Biometrics',
      fallbackLabel: 'Use Password',
    });
    return result.success;
  } catch (e) {
    return false;
  }
};

export const saveOfflineCredentials = async (email: string, password: string) => {
  if (typeof localStorage === 'undefined') return;

  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    email.toLowerCase() + password
  );

  const data = JSON.stringify({ email: email.toLowerCase(), hash });
  localStorage.setItem(OFFLINE_CRED_KEY, data);
};

export const verifyOfflineCredentials = async (email: string, password: string) => {
  if (typeof localStorage === 'undefined') return false;

  const stored = localStorage.getItem(OFFLINE_CRED_KEY);
  if (!stored) return false;

  const { email: storedEmail, hash: storedHash } = JSON.parse(stored);

  const currentHash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    email.toLowerCase() + password
  );

  return email.toLowerCase() === storedEmail && currentHash === storedHash;
};

export const getSavedEmail = async () => {
  if (typeof localStorage === 'undefined') return null;

  const stored = localStorage.getItem(OFFLINE_CRED_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored).email;
  } catch (e) {
    return null;
  }
};
