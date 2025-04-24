import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveTaskData } from '../lib/supabase';

export default function TaskScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    pd_status: ''
  });

  useEffect(() => {
    loadUserId();
  }, []);

  const loadUserId = async () => {
    try {
      const id = await AsyncStorage.getItem('user_id');
      if (!id) {
        Alert.alert('Error', 'No user ID found. Please login again.');
        router.replace('/');
        return;
      }
      setUserId(id);
    } catch (error) {
      console.error('Error loading user ID:', error);
      Alert.alert('Error', 'Failed to load user ID. Please login again.');
      router.replace('/');
    }
  };

  const handleSubmit = async () => {
    console.log('>>>>>>>>>>>>', userId);
    
    if (!userId) {
      Alert.alert('Error', 'User ID not found. Please login again.');
      return;
    }

    if (!formData.age || !formData.gender || !formData.pd_status) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const result = await saveTaskData({
        user_id: userId,
        age: parseInt(formData.age),
        gender: formData.gender,
        pd_status: formData.pd_status
      });

      if (result.success) {
        router.push('/task2');
      } else {
        Alert.alert('Error', 'Failed to save data');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while saving data');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.stepperContainer}>
        <View style={styles.stepActive}>
          <Text style={styles.stepTextActive}>1</Text>
        </View>
        <View style={styles.stepLine} />
        <View style={styles.step}>
          <Text style={styles.stepText}>2</Text>
        </View>
        <View style={styles.stepLine} />
        <View style={styles.step}>
          <Text style={styles.stepText}>3</Text>
        </View>
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Age"
          placeholderTextColor="#666"
          keyboardType="number-pad"
          value={formData.age}
          onChangeText={(text) => setFormData(prev => ({ ...prev, age: text }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Gender"
          placeholderTextColor="#666"
          value={formData.gender}
          onChangeText={(text) => setFormData(prev => ({ ...prev, gender: text }))}
        />
        <TextInput
          style={styles.input}
          placeholder="PD Status"
          placeholderTextColor="#666"
          value={formData.pd_status}
          onChangeText={(text) => setFormData(prev => ({ ...prev, pd_status: text }))}
        />
        <Text style={styles.uidText}>UID: {userId || 'Loading...'}</Text>

        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Submit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    padding: 20,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  step: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 8,
  },
  stepText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepTextActive: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  formContainer: {
    flex: 1,
    width: '100%',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#2A2A2A',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 20,
  },
  uidText: {
    color: '#666',
    fontSize: 14,
    marginBottom: 30,
    marginLeft: 20,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF3D8A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 