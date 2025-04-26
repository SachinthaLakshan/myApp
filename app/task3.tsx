import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert, Modal, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { Audio, AVPlaybackStatus, AVPlaybackSource } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadAudioRecording } from '../lib/supabase';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const TASK_TIME_LIMIT = 5; // 5 seconds for each vowel

interface RecordingLine {
  sound: Audio.Sound;
  duration: string;
  file: string | null;
}

export default function Task3Screen() {
  const [timeLeft, setTimeLeft] = useState(TASK_TIME_LIMIT);
  const [isStarted, setIsStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [activeVowelIndex, setActiveVowelIndex] = useState(-1);
  const [completedVowels, setCompletedVowels] = useState(new Array(5).fill(false));
  const [recording, setRecording] = useState<Audio.Recording | undefined>(undefined);
  const [recordings, setRecordings] = useState<RecordingLine[]>([]);
  const [uploading, setUploading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processingRecord, setProcessingRecord] = useState(false);
  const [audioBars] = useState(new Array(20).fill(0).map(() => new Animated.Value(0)));
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.ceil(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isStarted && activeVowelIndex >= 0) {
      // Calculate time based on actual elapsed time
      const updateTimer = () => {
        const elapsedTime = (Date.now() - startTimeRef.current) / 1000;
        const newTimeLeft = Math.max(TASK_TIME_LIMIT - elapsedTime, 0);
        setTimeLeft(newTimeLeft);
        if (newTimeLeft <= 0) {
          handleTimeUp();
        }
      };
      timerRef.current = setInterval(updateTimer, 100);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [isStarted, activeVowelIndex]);

  useEffect(() => {
    if (isStarted) {
      // Animate progress circle
      progressAnimation.setValue(0);
      Animated.timing(progressAnimation, {
        toValue: 1,
        duration: TASK_TIME_LIMIT * 1000,
        useNativeDriver: true,
      }).start();
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

  useEffect(() => {
    if (recording) {
      const timer = setTimeout(() => {
        stopRecording();
      }, TASK_TIME_LIMIT*1000);
  
      return () => clearTimeout(timer);
    }
  }, [recording]);

  useEffect(()=>{
    console.log('recordings.length:',recordings.length,'activeVowelIndex:',activeVowelIndex);
    if(activeVowelIndex >= 0){
      if(recordings.length == activeVowelIndex+1){
        setProcessingRecord(false);
      }
    }
  },[recordings])

  const handleTimeUp = () => {
    setProcessingRecord(true);
    if (activeVowelIndex >= 0) {
      const newCompletedVowels = [...completedVowels];
      newCompletedVowels[activeVowelIndex] = true;
      setCompletedVowels(newCompletedVowels);
      setIsStarted(false);
      setTimeLeft(TASK_TIME_LIMIT);
      if (newCompletedVowels.every(v => v)) {
        setIsCompleted(true);
      }
    }
  };

  const startVowelExercise = (index: number) => {
    console.log('index::>>:',index);
    
    setActiveVowelIndex(index);
    setIsStarted(true);
    setTimeLeft(TASK_TIME_LIMIT);
    startTimeRef.current = Date.now();
    progressAnimation.setValue(0);
    Animated.timing(progressAnimation, {
      toValue: 1,
      duration: TASK_TIME_LIMIT * 1000,
      useNativeDriver: true,
    }).start();
    startRecording();
    // Animate audio bars (already handled in useEffect)
  };

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

  const handleComplete = async () => {
    if (uploading) return; // Prevent double upload
    if (recordings.length < 5 || recordings.some(r => !r.file)) {
      Alert.alert('Error', 'All vowels must be recorded.');
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
      for (let i = 0; i < recordings.length; i++) {
        const rec = recordings[i];
        if (!rec || !rec.file) {
          setUploading(false);
          Alert.alert('Error', `Recording for vowel ${i + 1} is missing.`);
          return;
        }
        const result = await uploadAudioRecording(userId, rec.file);
        if (!result.success) {
          setUploading(false);
          Alert.alert('Upload Failed', result.error || 'Unknown error');
          return;
        }
      }
      setUploading(false);
      router.push('/task');
    } catch (error) {
      setUploading(false);
      Alert.alert('Error', 'Failed to upload recordings.');
    }
  };

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

  const vowels = ['a', 'e', 'i', 'o', 'u'];

  return (
    <View style={styles.container}>
      <View style={styles.stepperContainer}>
        <View style={styles.step}>
          <Text style={styles.stepText}>1</Text>
        </View>
        <View style={styles.stepLine} />
        <View style={styles.step}>
          <Text style={styles.stepText}>2</Text>
        </View>
        <View style={styles.stepLine} />
        <View style={styles.stepActive}>
          <Text style={styles.stepTextActive}>3</Text>
        </View>
      </View>

      {isStarted && renderTimer()}

      <View style={styles.vowelsContainer}>
        {vowels.map((vowel, index) => (
          <View key={index} style={styles.vowelRow}>
            <View style={[
              styles.vowelButton,
              completedVowels[index] && styles.vowelButtonCompleted
            ]}>
              <Text style={[
                styles.vowelText,
                completedVowels[index] && styles.vowelTextCompleted
              ]}>Vowel "{vowel}"</Text>
            </View>
            {!completedVowels[index] && (
              <TouchableOpacity
                style={[
                  styles.startButton,
                  (!isStarted && (index === 0 || completedVowels[index - 1]))
                    ? styles.startButtonEnabled
                    : styles.startButtonDisabled
                ]}
                onPress={() => startVowelExercise(index)}
                disabled={isStarted || (index !== 0 && !completedVowels[index - 1])}
              >
                <Text style={[
                  styles.buttonText,
                  (isStarted || (index !== 0 && !completedVowels[index - 1])) && styles.buttonTextDisabled
                ]}>Start</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {isStarted && (
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
          styles.completeButton,
          !isCompleted && styles.completeButtonDisabled
        ]}
        onPress={() => isCompleted && handleComplete()}
        disabled={!isCompleted}
      >
        <Text style={[
          styles.buttonText,
          !isCompleted && styles.buttonTextDisabled
        ]}>Complete</Text>
      </TouchableOpacity>
      <Modal
        visible={uploading}
        transparent
        animationType="fade"
      >
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF3D8A" />
          <Text style={styles.loadingText}>Uploading audios...</Text>
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
  },
  stepTextActive: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
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
  vowelsContainer: {
    marginBottom: 10,
  },
  vowelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  vowelButton: {
    flex: 1,
    height: 50,
    backgroundColor: '#FF3D8A',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  vowelButtonCompleted: {
    backgroundColor: '#28b463',
  },
  vowelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  vowelTextCompleted: {
    color: '#FFFFFF',
  },
  startButton: {
    width: 100,
    height: 50,
    backgroundColor: '#28b463',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonEnabled: {
    backgroundColor: '#FF3D8A',
    opacity: 1,
  },
  startButtonDisabled: {
    backgroundColor: '#2A2A2A',
    opacity: 0.5,
  },
  audioVisualizerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 15,
    marginVertical: 10,
  },
  audioBar: {
    width: 3,
    borderRadius: 2,
  },
  completeButton: {
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
  completeButtonDisabled: {
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