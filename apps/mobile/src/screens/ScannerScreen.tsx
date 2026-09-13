import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Animated,
  Easing,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchFoodByBarcode,
  addFoodToPantry,
  createFood,
  FoodItem,
} from '../services/api';
import { evaluateNutritionFit } from '../services/nutritionCoach';
import { getNigerianSmartSwap } from '../services/nigerianSwaps';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');
const FRAME_WIDTH = 280;
const FRAME_HEIGHT = 160;
const RETICLE_TOP = Math.round((SCREEN_HEIGHT - FRAME_HEIGHT) / 2);
const RETICLE_LEFT = Math.round((SCREEN_WIDTH - FRAME_WIDTH) / 2);

type ScanStatus = 'idle' | 'scanning' | 'success' | 'not_found';

interface ScannerScreenProps {
  onCloseScanner: () => void;
}

export default function ScannerScreen({ onCloseScanner }: ScannerScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [scannedFood, setScannedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState('100');

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newCalories, setNewCalories] = useState('');
  const [newProtein, setNewProtein] = useState('');
  const [newCarbs, setNewCarbs] = useState('');
  const [newFat, setNewFat] = useState('');
  const [savingNewFood, setSavingNewFood] = useState(false);

  const laserAnim = useRef(new Animated.Value(0)).current;
  const isProcessing = useRef(false);

  useEffect(() => {
    const sweep = Animated.loop(
      Animated.sequence([
        Animated.timing(laserAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(laserAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    sweep.start();
    return () => sweep.stop();
  }, [laserAnim]);

  if (!permission) {
    return (
      <View style={[styles.darkBackground, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.darkBackground, { backgroundColor: theme.colors.bg }]}>
        <Ionicons name="camera-outline" size={64} color={theme.colors.textMuted} />
        <Text style={[styles.permissionText, { color: theme.colors.textSecondary }]}>Camera permission is required to scan product barcodes</Text>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.colors.accent }]} onPress={requestPermission}>
          <Text style={[styles.buttonText, { color: theme.colors.accentText }]}>Enable Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.textButton} onPress={onCloseScanner}>
          <Text style={[styles.textButtonLabel, { color: theme.colors.textSecondary }]}>Back to Core</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (isProcessing.current || status !== 'idle') return;

    const cleanCode = data ? data.trim() : '';
    if (!cleanCode || cleanCode.startsWith('http://') || cleanCode.startsWith('https://')) return;

    isProcessing.current = true;
    setStatus('scanning');
    setScannedBarcode(cleanCode);
    setProgress(25);

    const timer = setInterval(() => {
      setProgress((prev) => (prev < 85 ? prev + 15 : prev));
    }, 120);

    try {
      const food = await fetchFoodByBarcode(cleanCode);
      clearInterval(timer);
      setProgress(100);
      setStatus('success');
      setScannedFood(food);
    } catch (err: any) {
      clearInterval(timer);
      setProgress(0);
      setStatus('not_found');
      setErrorMessage(
        err.response?.data?.error || `Product not found for barcode: ${cleanCode}`
      );
    } finally {
      clearInterval(timer);
    }
  };

  const resetScanner = () => {
    isProcessing.current = false;
    setStatus('idle');
    setProgress(0);
    setScannedFood(null);
    setErrorMessage('');
    setShowQuickAdd(false);
  };

  const handleLogToPantry = async () => {
    Keyboard.dismiss();
    if (!scannedFood) return;
    const parsedQty = parseFloat(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid amount in grams.');
      return;
    }

    try {
      await addFoodToPantry(scannedFood.id, parsedQty, scannedFood.serving_unit || 'g');
      Alert.alert('Success', `Added ${scannedFood.name} to vault!`, [
        { text: 'View Vault', onPress: onCloseScanner },
        { text: 'Scan Next', onPress: resetScanner },
      ]);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'Failed to save to vault.');
    }
  };

  const handleSaveCustomProduct = async () => {
    Keyboard.dismiss();
    if (!newName.trim()) {
      Alert.alert('Required', 'Please enter a product name.');
      return;
    }

    setSavingNewFood(true);
    try {
      const newFoodItem = await createFood({
        barcode: scannedBarcode,
        name: newName.trim(),
        brand: newBrand.trim(),
        serving_size: 100,
        serving_unit: 'g',
        calories_per_100g: parseFloat(newCalories) || 0,
        protein_per_100g: parseFloat(newProtein) || 0,
        carbs_per_100g: parseFloat(newCarbs) || 0,
        fat_per_100g: parseFloat(newFat) || 0,
      });

      setNewName('');
      setNewBrand('');
      setNewCalories('');
      setNewProtein('');
      setNewCarbs('');
      setNewFat('');
      setShowQuickAdd(false);

      setScannedFood(newFoodItem);
      setStatus('success');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Could not save product.');
    } finally {
      setSavingNewFood(false);
    }
  };

  const laserTranslate = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [6, FRAME_HEIGHT - 10],
  });

  return (
    <View style={styles.root}>
      {/* Camera */}
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'],
        }}
        onBarcodeScanned={status === 'idle' ? handleBarcodeScanned : undefined}
      />

      {/* Reticle */}
      <View style={styles.reticleBox} pointerEvents="none">
        <View style={[styles.corner, styles.cornerTL, { borderColor: theme.colors.accent }]} />
        <View style={[styles.corner, styles.cornerTR, { borderColor: theme.colors.accent }]} />
        <View style={[styles.corner, styles.cornerBL, { borderColor: theme.colors.accent }]} />
        <View style={[styles.corner, styles.cornerBR, { borderColor: theme.colors.accent }]} />

        <Animated.View
          style={[
            styles.laser,
            {
              backgroundColor: theme.colors.protein,
              transform: [{ translateY: laserTranslate }],
              opacity: status === 'scanning' ? 0.3 : 1,
            },
          ]}
        />

        {status === 'scanning' && (
          <View style={[styles.progressCard, { backgroundColor: theme.colors.surface }]}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
            <Text style={[styles.progressLabel, { color: theme.colors.textPrimary }]}>Querying Database...</Text>
            <View style={[styles.progressBarTrack, { backgroundColor: theme.colors.surfaceSecondary }]}>
              <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: theme.colors.accent }]} />
            </View>
            <Text style={[styles.progressPercentage, { color: theme.colors.textSecondary }]}>{progress}%</Text>
          </View>
        )}
      </View>

      {/* Header */}
      <View style={[styles.headerContainer, { top: insets.top + 12 }]} pointerEvents="box-none">
        <View style={[styles.headerPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <TouchableOpacity style={styles.backButton} onPress={onCloseScanner}>
            <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>BARCODE MATRIX</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>Align barcode in frame</Text>
          </View>
        </View>
      </View>

      {/* Product Not Found Card */}
      {status === 'not_found' && (
        <View style={[styles.bottomContainer, { bottom: insets.bottom + 16 }]} pointerEvents="box-none">
          <View style={[styles.errorCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Ionicons name="help-circle" size={24} color={theme.colors.carbs} />
            <View style={styles.errorTextContainer}>
              <Text style={[styles.errorHeading, { color: theme.colors.textPrimary }]}>New Product ({scannedBarcode})</Text>
              <Text style={[styles.errorMessage, { color: theme.colors.textSecondary }]} numberOfLines={2}>
                Product not cataloged yet. Add custom nutrition data?
              </Text>
            </View>
            <View style={styles.errorActionCol}>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.colors.accent }]} onPress={() => setShowQuickAdd(true)}>
                <Ionicons name="add" size={16} color={theme.colors.accentText} />
                <Text style={[styles.addBtnText, { color: theme.colors.accentText }]}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={resetScanner}>
                <Text style={[styles.cancelBtnText, { color: theme.colors.textSecondary }]}>Rescan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Quick Add Modal */}
      <Modal visible={showQuickAdd} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalShade}>
          <View style={[styles.modalSheet, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, maxHeight: '88%' }]}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={[styles.foodTitle, { color: theme.colors.textPrimary }]}>Register Food</Text>
                <Text style={[styles.foodBrand, { color: theme.colors.textSecondary }]}>Barcode: {scannedBarcode}</Text>
              </View>
              <TouchableOpacity onPress={resetScanner} style={styles.closeHitBox}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Product Name *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.colors.surfaceSecondary, color: theme.colors.textPrimary }]}
                placeholder="e.g. Golden Penny Semovita"
                placeholderTextColor={theme.colors.textMuted}
                value={newName}
                onChangeText={setNewName}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />

              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Brand / Source (Optional)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.colors.surfaceSecondary, color: theme.colors.textPrimary }]}
                placeholder="e.g. Flour Mills of Nigeria"
                placeholderTextColor={theme.colors.textMuted}
                value={newBrand}
                onChangeText={setNewBrand}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />

              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginTop: 6 }]}>
                Nutritional Profile (Per 100g)
              </Text>
              <View style={styles.inputGrid}>
                <View style={styles.gridCol}>
                  <Text style={[styles.gridLabel, { color: theme.colors.textMuted }]}>Calories (kcal)</Text>
                  <TextInput
                    style={[styles.gridInput, { backgroundColor: theme.colors.surfaceSecondary, color: theme.colors.textPrimary }]}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                    value={newCalories}
                    onChangeText={setNewCalories}
                  />
                </View>
                <View style={styles.gridCol}>
                  <Text style={[styles.gridLabel, { color: theme.colors.textMuted }]}>Protein (g)</Text>
                  <TextInput
                    style={[styles.gridInput, { backgroundColor: theme.colors.surfaceSecondary, color: theme.colors.textPrimary }]}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                    value={newProtein}
                    onChangeText={setNewProtein}
                  />
                </View>
              </View>

              <View style={styles.inputGrid}>
                <View style={styles.gridCol}>
                  <Text style={[styles.gridLabel, { color: theme.colors.textMuted }]}>Carbs (g)</Text>
                  <TextInput
                    style={[styles.gridInput, { backgroundColor: theme.colors.surfaceSecondary, color: theme.colors.textPrimary }]}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                    value={newCarbs}
                    onChangeText={setNewCarbs}
                  />
                </View>
                <View style={styles.gridCol}>
                  <Text style={[styles.gridLabel, { color: theme.colors.textMuted }]}>Fat (g)</Text>
                  <TextInput
                    style={[styles.gridInput, { backgroundColor: theme.colors.surfaceSecondary, color: theme.colors.textPrimary }]}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                    placeholder="0"
                    placeholderTextColor={theme.colors.textMuted}
                    value={newFat}
                    onChangeText={setNewFat}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.colors.accent, marginTop: 16 }]}
                onPress={handleSaveCustomProduct}
                disabled={savingNewFood}
              >
                {savingNewFood ? (
                  <ActivityIndicator color={theme.colors.accentText} size="small" />
                ) : (
                  <Text style={[styles.buttonText, { color: theme.colors.accentText }]}>Save & Log to Vault</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Success Modal */}
      <Modal visible={status === 'success' && !!scannedFood} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalShade}>
          <View style={[styles.modalSheet, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, paddingBottom: insets.bottom + 20, maxHeight: '90%' }]}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.foodTitle, { color: theme.colors.textPrimary }]}>{scannedFood?.name}</Text>
                {scannedFood?.brand ? (
                  <Text style={[styles.foodBrand, { color: theme.colors.textSecondary }]}>{scannedFood.brand}</Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={resetScanner} style={styles.closeHitBox}>
                <Ionicons name="close" size={24} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* AI Hypertrophy Fit */}
              {scannedFood && (() => {
                const fit = evaluateNutritionFit(scannedFood, 'hypertrophy');
                return (
                  <View style={[styles.aiFitBox, { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border }]}>
                    <View style={styles.aiFitHeader}>
                      <Ionicons name="sparkles" size={14} color={theme.colors.accent} />
                      <Text style={[styles.aiFitBadgeText, { color: theme.colors.textPrimary }]}>
                        {fit.badgeTitle}
                      </Text>
                    </View>
                    <Text style={[styles.aiFitSummary, { color: theme.colors.textSecondary }]}>{fit.summary}</Text>
                  </View>
                );
              })()}

              {/* Nigerian Smart Swap Card */}
              {scannedFood && (() => {
                const swap = getNigerianSmartSwap(scannedFood.name, scannedFood.brand, 'hypertrophy');
                if (!swap) return null;

                return (
                  <View style={[styles.swapCard, { backgroundColor: theme.colors.carbsBg, borderColor: theme.colors.carbs }]}>
                    <View style={styles.swapHeader}>
                      <Ionicons name="swap-horizontal" size={15} color={theme.colors.carbs} />
                      <Text style={[styles.swapTitle, { color: theme.colors.carbs }]}>Naija Macro Swap</Text>
                    </View>
                    <Text style={[styles.swapAlternative, { color: theme.colors.textPrimary }]}>
                      Try: <Text style={{ fontWeight: '700' }}>{swap.alternativeName}</Text> ({swap.brandOrSource})
                    </Text>
                    <Text style={[styles.swapReason, { color: theme.colors.textSecondary }]}>{swap.reason}</Text>
                  </View>
                );
              })()}

              {/* Macros Breakdown */}
              <View style={styles.macroRow}>
                <View style={[styles.macroPill, { backgroundColor: theme.colors.surfaceSecondary }]}>
                  <Text style={[styles.macroValue, { color: theme.colors.textPrimary }]}>{scannedFood?.calories_per_100g}</Text>
                  <Text style={[styles.macroUnit, { color: theme.colors.textSecondary }]}>kcal/100g</Text>
                </View>
                <View style={[styles.macroPill, { backgroundColor: theme.colors.proteinBg }]}>
                  <Text style={[styles.macroValue, { color: theme.colors.protein }]}>{scannedFood?.protein_per_100g}g</Text>
                  <Text style={[styles.macroUnit, { color: theme.colors.protein }]}>Protein</Text>
                </View>
                <View style={[styles.macroPill, { backgroundColor: theme.colors.carbsBg }]}>
                  <Text style={[styles.macroValue, { color: theme.colors.carbs }]}>{scannedFood?.carbs_per_100g}g</Text>
                  <Text style={[styles.macroUnit, { color: theme.colors.carbs }]}>Carbs</Text>
                </View>
                <View style={[styles.macroPill, { backgroundColor: theme.colors.fatBg }]}>
                  <Text style={[styles.macroValue, { color: theme.colors.fat }]}>{scannedFood?.fat_per_100g}g</Text>
                  <Text style={[styles.macroUnit, { color: theme.colors.fat }]}>Fat</Text>
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Amount to Log ({scannedFood?.serving_unit || 'g'}):</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.colors.surfaceSecondary, color: theme.colors.textPrimary }]}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                value={quantity}
                onChangeText={setQuantity}
              />

              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.colors.accent }]} onPress={handleLogToPantry}>
                <Text style={[styles.buttonText, { color: theme.colors.accentText }]}>Log Item to Vault</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.textButton} onPress={resetScanner}>
                <Text style={[styles.textButtonLabel, { color: theme.colors.textSecondary }]}>Cancel & Scan Next</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  darkBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  reticleBox: {
    position: 'absolute',
    top: RETICLE_TOP,
    left: RETICLE_LEFT,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    zIndex: 5,
  },
  laser: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 2,
    borderRadius: 2,
  },
  corner: {
    position: 'absolute',
    width: 22,
    height: 22,
  },
  cornerTL: { top: -1, left: -1, borderTopWidth: 3.5, borderLeftWidth: 3.5, borderTopLeftRadius: 14 },
  cornerTR: { top: -1, right: -1, borderTopWidth: 3.5, borderRightWidth: 3.5, borderTopRightRadius: 14 },
  cornerBL: { bottom: -1, left: -1, borderBottomWidth: 3.5, borderLeftWidth: 3.5, borderBottomLeftRadius: 14 },
  cornerBR: { bottom: -1, right: -1, borderBottomWidth: 3.5, borderRightWidth: 3.5, borderBottomRightRadius: 14 },
  progressCard: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  progressBarTrack: {
    width: '90%',
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  progressPercentage: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  headerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  backButton: {
    padding: 6,
    marginRight: 8,
  },
  headerTextWrap: {
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  bottomContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 10,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 14,
    borderRadius: 16,
  },
  errorTextContainer: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  errorHeading: {
    fontSize: 13,
    fontWeight: '800',
  },
  errorMessage: {
    fontSize: 11,
    marginTop: 2,
  },
  errorActionCol: {
    alignItems: 'center',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 6,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 2,
  },
  cancelBtn: {
    paddingVertical: 2,
  },
  cancelBtnText: {
    fontSize: 11,
  },
  permissionText: {
    textAlign: 'center',
    marginVertical: 16,
    fontSize: 14,
  },
  primaryButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  modalShade: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderTopWidth: 1,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  foodTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  foodBrand: {
    fontSize: 12,
    marginTop: 2,
  },
  closeHitBox: {
    padding: 4,
  },
  aiFitBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  aiFitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  aiFitBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6,
  },
  aiFitSummary: {
    fontSize: 11.5,
  },
  swapCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  swapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  swapTitle: {
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  swapAlternative: {
    fontSize: 12,
    marginBottom: 3,
  },
  swapReason: {
    fontSize: 11,
    lineHeight: 15,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  macroPill: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  macroValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  macroUnit: {
    fontSize: 9,
    marginTop: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  textInput: {
    borderRadius: 10,
    padding: 10,
    fontSize: 13.5,
    marginBottom: 12,
  },
  inputGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  gridCol: {
    flex: 0.48,
  },
  gridLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  gridInput: {
    borderRadius: 10,
    padding: 10,
    fontSize: 13.5,
  },
  textButton: {
    padding: 10,
    alignItems: 'center',
  },
  textButtonLabel: {
    fontSize: 12,
  },
});