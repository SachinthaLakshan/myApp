import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native';
import { router } from 'expo-router';
import { Audio } from 'expo-av';
import Svg, { Circle } from 'react-native-svg';

const TASK_TIME_LIMIT = 5; // 60 seconds for each vowel

export default function Task3Screen() {
  const [timeLeft, setTimeLeft] = useState(TASK_TIME_LIMIT);
  const [isStarted, setIsStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [activeVowelIndex, setActiveVowelIndex] = useState(-1);
  const [completedVowels, setCompletedVowels] = useState(new Array(5).fill(false));
  const [audioBars] = useState(new Array(20).fill(0).map(() => new Animated.Value(0)));
  const [progressAnimation] = useState(new Animated.Value(0));

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isStarted && timeLeft > 0) {
      // Animate progress circle
      Animated.timing(progressAnimation, {
        toValue: 1 - (timeLeft / TASK_TIME_LIMIT),
        duration: 1000,
        useNativeDriver: true,
      }).start();

      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isStarted, timeLeft]);

  const handleTimeUp = () => {
    if (activeVowelIndex >= 0) {
      const newCompletedVowels = [...completedVowels];
      newCompletedVowels[activeVowelIndex] = true;
      setCompletedVowels(newCompletedVowels);
      setIsStarted(false);
      setTimeLeft(TASK_TIME_LIMIT);
      
      // Check if all vowels are completed
      if (newCompletedVowels.every(v => v)) {
        setIsCompleted(true);
      }
    }
  };

  const startVowelExercise = (index: number) => {
    setActiveVowelIndex(index);
    setIsStarted(true);
    setTimeLeft(TASK_TIME_LIMIT);

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
  };

  const renderTimer = () => {
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
          <Circle
            cx="60"
            cy="60"
            r="55"
            stroke="#FF3D8A"
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 55}`}
            strokeDashoffset={`${2 * Math.PI * 55 * (1 - timeLeft / TASK_TIME_LIMIT)}`}
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

      {renderTimer()}

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
        onPress={() => isCompleted && router.push('/')}
        disabled={!isCompleted}
      >
        <Text style={[
          styles.buttonText,
          !isCompleted && styles.buttonTextDisabled
        ]}>Complete</Text>
      </TouchableOpacity>
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
}); 