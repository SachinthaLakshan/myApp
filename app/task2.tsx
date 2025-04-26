import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Button, Alert, ActivityIndicator, Modal } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { Audio, AVPlaybackStatus, AVPlaybackSource } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadAudioRecording } from '../lib/supabase';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const TASK_TIME_LIMIT = 10; // 10 seconds for the task

interface RecordingLine {
  sound: Audio.Sound;
  duration: string;
  file: string | null;
}

export default function Task2Screen() {
  const [timeLeft, setTimeLeft] = useState(TASK_TIME_LIMIT);
  const [isStarted, setIsStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [audioBars] = useState(new Array(20).fill(0).map(() => new Animated.Value(0)));
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const [recording, setRecording] = useState<Audio.Recording | undefined>(undefined);
  const [recordings, setRecordings] = useState<RecordingLine[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processingRecord, setProcessingRecord] = useState(false);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.ceil(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (recording) {
      const timer = setTimeout(() => {
        stopRecording();
      }, TASK_TIME_LIMIT*1000);
  
      return () => clearTimeout(timer);
    }
  }, [recording]);

  useEffect(()=>{
    if(recordings.length>0){
      setProcessingRecord(false);
    }
  },[recordings])

  const handleStart = () => {
    setIsStarted(true);
    startTimeRef.current = Date.now();
    
    // Reset and start progress animation
    progressAnimation.setValue(0);
    Animated.timing(progressAnimation, {
      toValue: 1,
      duration: TASK_TIME_LIMIT * 1000,
      useNativeDriver: true,
    }).start();
    startRecording();
  };

  const handleTimeUp = () => {
    setIsCompleted(true);
    setProcessingRecord(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const handleNext = async () => {
    if (uploading) return; // Prevent double upload
    if (!recordings.length) {
      Alert.alert('Error', 'No recording found.');
      return;
    }
    const firstRecording = recordings[0];
    if (!firstRecording.file) {
      Alert.alert('Error', 'Recording file not found.');
      return;
    }
    setUploading(true);
    try {
      const userId = await AsyncStorage.getItem('user_id');
      if (!userId) {
        Alert.alert('Error', 'User ID not found.');
        setUploading(false);
        return;
      }
      const result = await uploadAudioRecording(userId, firstRecording.file);
      if (result.success) {
        setUploading(false);
        router.push('/task3');
      } else {
        setUploading(false);
        Alert.alert('Upload Failed', result.error || 'Unknown error');
      }
    } catch (error) {
      setUploading(false);
      Alert.alert('Error', 'Failed to upload recording.');
    }
  };

  useEffect(() => {
    if (isStarted && !isCompleted) {
      // Calculate time based on actual elapsed time
      const updateTimer = () => {
        const elapsedTime = (Date.now() - startTimeRef.current) / 1000;
        const newTimeLeft = Math.max(TASK_TIME_LIMIT - elapsedTime, 0);
        
        setTimeLeft(newTimeLeft);
        
        if (newTimeLeft <= 0) {
          handleTimeUp();
        }
      };

      // Update more frequently for smoother countdown
      timerRef.current = setInterval(updateTimer, 100);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [isStarted, isCompleted]);

  useEffect(() => {
    if (isStarted) {
      // Animate audio bars
      audioBars.forEach((bar) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(bar, {
              toValue: Math.random() * 40 + 10,
              duration: 500 + Math.random() * 500,
              useNativeDriver: false,
            }),
            Animated.timing(bar, {
              toValue: 10,
              duration: 500 + Math.random() * 500,
              useNativeDriver: false,
            }),
          ])
        ).start();
      });
    }
  }, [isStarted]);

  //
  async function startRecording() {
    console.log('startRecording...')
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
      }
    } catch (err) {}
  }

  async function stopRecording() {
    if (!recording) return;
    setRecording(undefined);
    await recording.stopAndUnloadAsync();
    let allRecordings = [...recordings];
    const { sound, status } = await recording.createNewLoadedSoundAsync();
    let duration = '0:00';
    if ((status as AVPlaybackStatus).isLoaded) {
      const loadedStatus = status as AVPlaybackStatus & { isLoaded: true; durationMillis: number };
      duration = getDurationFormatted(loadedStatus.durationMillis);
    }
    allRecordings.push({
      sound: sound,
      duration: duration,
      file: recording.getURI(),
    });
    setRecordings(allRecordings);
   
  }

  function getDurationFormatted(milliseconds: number): string {
    const minutes = milliseconds / 1000 / 60;
    const seconds = Math.round((minutes - Math.floor(minutes)) * 60);
    return seconds < 10
      ? `${Math.floor(minutes)}:0${seconds}`
      : `${Math.floor(minutes)}:${seconds}`;
  }

  function getRecording() {
    return recordings.map((recordingLine, index) => {
      recordingLine.sound.replayAsync();
      
    });
  }

  function clearRecordings() {
    setRecordings([]);
  }

  const renderTimer = () => {
    const circumference = 2 * Math.PI * 55;
    
    return (
      <View style={styles.timerContainer}>
        <Svg height="120" width="120" style={styles.timerSvg}>
          {/* Background circle */}
          <Circle
            cx="60"
            cy="60"
            r="55"
            stroke="#2A2A2A"
            strokeWidth="4"
            fill="none"
          />
          {/* Progress circle */}
          <AnimatedCircle
            cx="60"
            cy="60"
            r="55"
            stroke="#FF3D8A"
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={progressAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [circumference, 0]
            })}
            transform="rotate(-90 60 60)"
          />
        </Svg>
        <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.stepperContainer}>
        <View style={styles.step}>
          <Text style={styles.stepText}>1</Text>
        </View>
        <View style={styles.stepLine} />
        <View style={styles.stepActive}>
          <Text style={styles.stepTextActive}>2</Text>
        </View>
        <View style={styles.stepLine} />
        <View style={styles.step}>
          <Text style={styles.stepText}>3</Text>
        </View>
      </View>

      {renderTimer()}

      <Text style={styles.content}>
        Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem
        Ipsum has been the industry's standard dummy text ever since the 1500s, when an
        unknown printer took a galley of type and scrambled it to make a type specimen book. It
        has survived not only five centuries, but also the leap into electronic typesetting,
      </Text>

      {!isStarted && (
        <TouchableOpacity 
          style={styles.startButton}
          onPress={handleStart}
        >
          <Text style={styles.buttonText}>Start</Text>
        </TouchableOpacity>
      )}

      {isStarted && !isCompleted && (
        <View style={styles.audioVisualizerContainer}>
          {audioBars.map((bar, index) => (
            <Animated.View
              key={index}
              style={[
                styles.audioBar,
                {
                  height: bar,
                  backgroundColor: index % 2 === 0 ? '#FF3D8A' : '#00E5FF',
                },
              ]}
            />
          ))}
        </View>
      )}
      <TouchableOpacity 
        style={[
          styles.button,
          !isCompleted && styles.buttonDisabled
        ]}
        onPress={handleNext}
        disabled={!isCompleted}
      >
        <Text style={[
          styles.buttonText,
          !isCompleted && styles.buttonTextDisabled
        ]}>Next</Text>
      </TouchableOpacity>

      <Modal
        visible={uploading}
        transparent
        animationType="fade"
      >
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF3D8A" />
          <Text style={styles.loadingText}>Uploading audio...</Text>
        </View>
      </Modal>
      <Modal
        visible={processingRecord}
        transparent
        animationType="fade"
      >
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF3D8A" />
          <Text style={styles.loadingText}>Processing Record...</Text>
        </View>
      </Modal>
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
    textAlign: 'center',
  },
  stepTextActive: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  timerSvg: {
    transform: [{ rotateZ: '0deg' }],
  },
  timerText: {
    position: 'absolute',
    fontSize: 36,
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  content: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 30,
    backgroundColor: 'rgba(255, 61, 138, 0.1)',
    padding: 20,
    borderRadius: 15,
  },
  startButton: {
    width: 100,
    height: 50,
    backgroundColor: '#28b463',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20
  },
  audioVisualizerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    marginBottom: 20,
  },
  audioBar: {
    width: 3,
    borderRadius: 2,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF3D8A',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
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
  buttonTextDisabled: {
    color: '#666',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(26,26,26,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  loadingText: {
    color: '#FF3D8A',
    marginTop: 16,
    fontSize: 16,
    fontWeight: 'bold',
  },
});