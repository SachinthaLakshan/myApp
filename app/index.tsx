import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { verifyKeycode } from '../lib/supabase';

export default function Index() {
  const [keycode, setKeycode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (keycode.length < 4) {
      setError('Keycode must be at least 4 characters');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await verifyKeycode(keycode);
      
      if (result.success && result.data) {
        await AsyncStorage.setItem('user_id', result.data.user_id);
        router.push('/task');
      } else {
        setError('Invalid keycode. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Enter Your Login Code"
        placeholderTextColor="#666"
        keyboardType="number-pad"
        value={keycode}
        onChangeText={setKeycode}
        maxLength={6}
        editable={!isLoading}
      />

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#2A2A2A',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  errorText: {
    color: '#FF3D3D',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF3D8A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF3D8A',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: '#2A2A2A',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 