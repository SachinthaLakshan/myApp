import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack 
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#1A1A1A' }
        }} 
      />
    </>
  );
}
