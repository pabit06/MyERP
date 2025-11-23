import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'MyERP Member', headerShown: false }} />
      <Stack.Screen name="login" options={{ title: 'Sign In', headerShown: true }} />
    </Stack>
  );
}
