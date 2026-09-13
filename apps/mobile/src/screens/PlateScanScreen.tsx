import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  Alert,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { decomposePreparedPlate } from '../services/api';
import {
  DecomposedItem,
  OFFLINE_NIGERIAN_PRESETS,
  computeTotalPlateMacros,
} from '../services/plateEstimator';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

// Generous circular surface area tailored to dinner plates & soup bowls
const CIRCLE_DIAMETER = Math.min(SCREEN_WIDTH * 0.85, 330);
const CENTER_TOP = Math.round((SCREEN_HEIGHT - CIRCLE_DIAMETER) / 2 - 25);
const CENTER_LEFT = Math.round((SCREEN_WIDTH - CIRCLE_DIAMETER) / 2);

interface PlateScanScreenProps {
  onBack: () => void;
  onLogMealSuccess: () => void;
}

export default function PlateScanScreen({ onBack, onLogMealSuccess }: PlateScanScreenProps) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  // Scanner state
  const [analyzing, setAnalyzing] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Parsed plate components
  const [detectedComponents, setDetectedComponents] = useState<DecomposedItem[]>([]);
  const [showDrawer, setShowDrawer] = useState(false);

  // Scanning animations
  const sweepAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Continuous vertical sweep through the plate ring
    const sweep = Animated.loop(
      Animated.sequence([
        Animated.timing(sweepAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sweepAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // 2. Subtle ambient pulse for the reticle border
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    sweep.start();
    pulse.start();

    return () => {
      sweep.stop();
      pulse.stop();
    };
  }, [sweepAnim, pulseAnim]);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#38bdf8" size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={64} color="#94a3b8" style={{ marginBottom: 12 }} />
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 6 }}>
          Camera Access Required
        </Text>
        <Text style={{ color: '#94a3b8', textAlign: 'center', marginBottom: 20, paddingHorizontal: 32 }}>
          Allow camera access to analyze compound Nigerian meals and stews.
        </Text>
        <TouchableOpacity style={styles.actionBtn} onPress={requestPermission}>
          <Text style={styles.btnText}>Enable Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleSnapPlate = async () => {
    if (!cameraRef.current || analyzing) return;
    setAnalyzing(true);

    try {
      if (isOfflineMode) {
        // Instant on-device preset fallback
        setDetectedComponents(OFFLINE_NIGERIAN_PRESETS[0].components);
        setShowDrawer(true);
      } else {
        // Online Vision decomposition
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.35,
        });

        if (!photo?.base64) throw new Error('Could not capture frame');

        const result = await decomposePreparedPlate(photo.base64);

        const mapped: DecomposedItem[] = (result.components || []).map((c, idx) => ({
          id: String(idx + 1),
          name: c.food_name,
          category: c.category,
          grams: c.estimated_grams || 100,
          caloriesPer100g: 175,
          proteinPer100g: 8.5,
          carbsPer100g: 22.0,
          fatPer100g: 6.0,
        }));

        setDetectedComponents(mapped.length > 0 ? mapped : OFFLINE_NIGERIAN_PRESETS[0].components);
        setShowDrawer(true);
      }
    } catch (err: any) {
      Alert.alert(
        'Vision Engine Notice',
        'Could not reach online vision parser. Falling back to on-device Nigerian portion presets.',
        [
          {
            text: 'View Preset',
            onPress: () => {
              setDetectedComponents(OFFLINE_NIGERIAN_PRESETS[0].components);
              setShowDrawer(true);
            },
          },
        ]
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const adjustGrams = (id: string, delta: number) => {
    setDetectedComponents((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, grams: Math.max(10, item.grams + delta) } : item
      )
    );
  };

  const sweepTranslate = sweepAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [15, CIRCLE_DIAMETER - 20],
  });

  const totals = computeTotalPlateMacros(detectedComponents);

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* Top Controls Header */}
      <View style={[styles.topHeader, { top: insets.top + 12 }]} pointerEvents="box-none">
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Mode Toggle Switch */}
        <TouchableOpacity
          style={[styles.modePill, isOfflineMode && { backgroundColor: '#eab308' }]}
          onPress={() => setIsOfflineMode(!isOfflineMode)}
        >
          <Ionicons
            name={isOfflineMode ? 'flash-off-outline' : 'cloud-outline'}
            size={14}
            color="#0f172a"
          />
          <Text style={styles.modeText}>
            {isOfflineMode ? 'Offline Heuristic' : 'Online AI Vision'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Centered Circular Target Reticle (Directly Tappable) */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleSnapPlate}
        style={[
          styles.reticleContainer,
          {
            top: CENTER_TOP,
            left: CENTER_LEFT,
            width: CIRCLE_DIAMETER,
            height: CIRCLE_DIAMETER,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.circleFrame,
            {
              width: CIRCLE_DIAMETER,
              height: CIRCLE_DIAMETER,
              borderRadius: CIRCLE_DIAMETER / 2,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          {/* Sweeping Radar Line */}
          <Animated.View
            style={[
              styles.sweepLine,
              {
                width: CIRCLE_DIAMETER - 40,
                transform: [{ translateY: sweepTranslate }],
              },
            ]}
          />

          {analyzing && (
            <View style={styles.analyzingBackdrop}>
              <ActivityIndicator size="large" color="#38bdf8" />
              <Text style={styles.analyzingText}>Analyzing Plate Components...</Text>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>

      {/* Subtitle Cue */}
      <View style={[styles.instructionWrap, { top: CENTER_TOP + CIRCLE_DIAMETER + 16 }]} pointerEvents="none">
        <Text style={styles.instructionText}>
          {analyzing
            ? 'Decomposing dish portions...'
            : 'Frame plate in circle & tap anywhere to capture'}
        </Text>
      </View>

      {/* Bottom Shutter Action Button */}
      <View style={[styles.bottomControl, { bottom: insets.bottom + 20 }]} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.captureRing}
          onPress={handleSnapPlate}
          disabled={analyzing}
        >
          {analyzing ? (
            <ActivityIndicator color="#38bdf8" size="large" />
          ) : (
            <View style={styles.captureInner} />
          )}
        </TouchableOpacity>
      </View>

      {/* Component Breakdown Drawer Modal */}
      <Modal visible={showDrawer} animationType="slide" transparent>
        <View style={styles.drawerShade}>
          <View style={[styles.drawerSheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.drawerHeader}>
              <View>
                <Text style={styles.drawerTitle}>Plate Decomposition</Text>
                <Text style={styles.drawerSub}>
                  {isOfflineMode ? '⚡ On-Device Heuristic Engine' : '🌐 AI Vision Detected'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowDrawer(false)}>
                <Ionicons name="close-circle" size={26} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Total Macro Card */}
            <View style={styles.macroTotalCard}>
              <Text style={styles.totalCal}>{Math.round(totals.calories)} kcal</Text>
              <View style={styles.totalRow}>
                <Text style={[styles.macroPill, { color: '#38bdf8' }]}>
                  {totals.protein.toFixed(1)}g Protein
                </Text>
                <Text style={[styles.macroPill, { color: '#fbbf24' }]}>
                  {totals.carbs.toFixed(1)}g Carbs
                </Text>
                <Text style={[styles.macroPill, { color: '#f87171' }]}>
                  {totals.fat.toFixed(1)}g Fat
                </Text>
              </View>
            </View>

            {/* Components list with +/- portion adjustments */}
            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
              {detectedComponents.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemCat}>{item.category.toUpperCase()}</Text>
                  </View>
                  <View style={styles.stepperWrap}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => adjustGrams(item.id, -20)}
                    >
                      <Ionicons name="remove" size={16} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.gramText}>{item.grams}g</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() => adjustGrams(item.id, 20)}
                    >
                      <Ionicons name="add" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.savePlateBtn}
              onPress={() => {
                setShowDrawer(false);
                Alert.alert(
                  'Meal Logged',
                  `Logged ${Math.round(totals.calories)} kcal directly into your daily target.`,
                  [{ text: 'OK', onPress: onLogMealSuccess }]
                );
              }}
            >
              <Ionicons name="checkmark-done" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.savePlateBtnText}>Log Plate to Daily Macros</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  topHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  backButton: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    padding: 10,
    borderRadius: 14,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38bdf8',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modeText: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 12,
    marginLeft: 6,
  },
  reticleContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  circleFrame: {
    borderWidth: 2.5,
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#38bdf8',
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  sweepLine: {
    height: 3,
    backgroundColor: '#38bdf8',
    borderRadius: 2,
    shadowColor: '#38bdf8',
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  analyzingBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  analyzingText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },
  instructionWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 6,
  },
  instructionText: {
    color: '#f8fafc',
    fontSize: 12.5,
    fontWeight: '600',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    overflow: 'hidden',
  },
  bottomControl: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  captureRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#38bdf8',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },
  actionBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  drawerShade: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  drawerSheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  drawerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#f8fafc',
  },
  drawerSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  macroTotalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  totalCal: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f8fafc',
  },
  totalRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  macroPill: {
    fontSize: 13,
    fontWeight: '700',
    marginHorizontal: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  itemName: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  itemCat: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '700',
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepBtn: {
    backgroundColor: '#334155',
    padding: 6,
    borderRadius: 8,
  },
  gramText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '700',
    width: 54,
    textAlign: 'center',
  },
  savePlateBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 14,
  },
  savePlateBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});