import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  currentStep: number;   // 1-indexed
  totalSteps: number;
  labels?: string[];
  activeColor?: string;
  inactiveColor?: string;
}

export function StepIndicator({
  currentStep,
  totalSteps,
  labels = [],
  activeColor = '#26A69A',
  inactiveColor = '#D7CCC8',
}: Props) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {steps.map((step, index) => {
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;
          const hasLabel = labels[index] !== undefined;

          // Decide line color from the right side of this dot extending to next
          const lineIsActive = step < currentStep; 

          return (
            <View key={`step-${step}`} style={styles.stepColumn}>
              
              {/* Connecting line to the next dot (absolute positioned rightwards) */}
              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.absoluteLine,
                    { backgroundColor: lineIsActive ? activeColor : inactiveColor },
                  ]}
                />
              )}

              {/* Dot */}
              <View
                style={[
                  styles.dot,
                  isCompleted
                    ? { backgroundColor: activeColor, borderColor: activeColor }
                    : isCurrent
                    ? { backgroundColor: '#FFFFFF', borderColor: activeColor, borderWidth: 2.5 }
                    : { backgroundColor: inactiveColor, borderColor: inactiveColor },
                ]}
              >
                {isCompleted && <View style={styles.checkmark} />}
              </View>

              {/* Label */}
              {hasLabel && (
                <Text
                  style={[
                    styles.labelText,
                    { 
                      color: isCompleted || isCurrent ? '#4E342E' : '#9E9E9E',
                      fontWeight: isCompleted || isCurrent ? '700' : '500'
                    }
                  ]}
                >
                  {labels[index].toUpperCase()}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const DOT_SIZE = 14;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stepColumn: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  absoluteLine: {
    position: 'absolute',
    height: 2.5,
    top: DOT_SIZE / 2 - 1, // center vertically against dot
    left: '50%',
    right: '-50%',
    zIndex: 0,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1, // Stay above absolute line
    marginBottom: 8,
  },
  checkmark: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFFFFF',
  },
  labelText: {
    fontSize: 10,
    textAlign: 'center',
  },
});
