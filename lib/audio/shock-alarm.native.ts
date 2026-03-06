/**
 * Shock Alarm Manager — Native implementation (expo-av)
 *
 * Plays looping alarm sounds for critical/emergency shock index levels.
 * Mute state is persisted to AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

export type AlarmLevel = 'critical' | 'emergency';

const ALARM_MUTE_KEY = 'motivaid_alarm_muted';

// Module-level state
let criticalSound: Audio.Sound | null = null;
let emergencySound: Audio.Sound | null = null;
let currentlyPlaying: AlarmLevel | null = null;
let muted = false;
let initialized = false;

export async function initAlarmSounds(): Promise<void> {
    if (initialized) return;
    try {
        await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: false,
        });

        const { sound: critical } = await Audio.Sound.createAsync(
            require('@/assets/audio/alarm-critical.wav'),
            { shouldPlay: false, isLooping: true, volume: 0.8 }
        );
        criticalSound = critical;

        const { sound: emergency } = await Audio.Sound.createAsync(
            require('@/assets/audio/alarm-emergency.wav'),
            { shouldPlay: false, isLooping: true, volume: 1.0 }
        );
        emergencySound = emergency;

        // Load mute preference
        const storedMute = await AsyncStorage.getItem(ALARM_MUTE_KEY);
        muted = storedMute === 'true';

        initialized = true;
    } catch (error) {
        console.warn('[ShockAlarm] Failed to init alarm sounds:', error);
    }
}

export async function playAlarm(level: AlarmLevel): Promise<void> {
    if (muted || currentlyPlaying === level) return;

    await stopAlarm();

    const sound = level === 'emergency' ? emergencySound : criticalSound;
    if (!sound) return;

    try {
        await sound.setPositionAsync(0);
        await sound.playAsync();
        currentlyPlaying = level;
    } catch (error) {
        console.warn('[ShockAlarm] Failed to play alarm:', error);
    }
}

export async function stopAlarm(): Promise<void> {
    try {
        if (currentlyPlaying === 'critical' && criticalSound) {
            await criticalSound.stopAsync();
        }
        if (currentlyPlaying === 'emergency' && emergencySound) {
            await emergencySound.stopAsync();
        }
    } catch {
        // Sound may already be stopped
    }
    currentlyPlaying = null;
}

export async function setAlarmMuted(value: boolean): Promise<void> {
    muted = value;
    await AsyncStorage.setItem(ALARM_MUTE_KEY, String(value));
    if (value) await stopAlarm();
}

export function isAlarmMuted(): boolean {
    return muted;
}

export function isAlarmPlaying(): boolean {
    return currentlyPlaying !== null;
}

export async function releaseAlarmSounds(): Promise<void> {
    await stopAlarm();
    try {
        if (criticalSound) {
            await criticalSound.unloadAsync();
            criticalSound = null;
        }
        if (emergencySound) {
            await emergencySound.unloadAsync();
            emergencySound = null;
        }
    } catch {
        // Sounds may already be unloaded
    }
    initialized = false;
}
