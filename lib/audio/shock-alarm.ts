/**
 * Shock Alarm Manager — Web stub (no-op)
 *
 * On web, audio alarms are not supported.
 * All functions resolve immediately with no side effects.
 */

export type AlarmLevel = 'critical' | 'emergency';

export async function initAlarmSounds(): Promise<void> {}
export async function playAlarm(_level: AlarmLevel): Promise<void> {}
export async function stopAlarm(): Promise<void> {}
export async function setAlarmMuted(_muted: boolean): Promise<void> {}
export function isAlarmMuted(): boolean { return false; }
export function isAlarmPlaying(): boolean { return false; }
export async function releaseAlarmSounds(): Promise<void> {}
