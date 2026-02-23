import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      <Stack.Screen name="clinical/new-patient" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="clinical/patient-detail" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="clinical/record-vitals" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="management/emergency-contacts" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
