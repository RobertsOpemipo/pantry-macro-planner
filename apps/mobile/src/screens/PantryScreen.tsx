import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  FlatList,
  RefreshControl,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchPantryItems,
  deletePantryItem,
  PantryItemResponse,
} from '../services/api';
import { useTheme } from '../context/ThemeContext';

type ScreenType = 'home' | 'pantry' | 'scanner' | 'recipe' | 'platescan' | 'analytics';

interface PantryScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

export default function PantryScreen({ onNavigate }: PantryScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [items, setItems] = useState<PantryItemResponse[]>([]);
  const [filteredItems, setFilteredItems] = useState<PantryItemResponse[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // User Goals & Biometrics State
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [weight, setWeight] = useState('73.4');
  const [targetWeight, setTargetWeight] = useState('78');
  const [height, setHeight] = useState('178');
  const [proteinGoal, setProteinGoal] = useState('180');

  const loadPantry = useCallback(async () => {
    try {
      const data = await fetchPantryItems();
      setItems(data || []);
      setFilteredItems(data || []);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Could not load nutrient vault.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPantry();
  }, [loadPantry]);

  const handleSearch = (text: string) => {
    setSearch(text);
    if (!text.trim()) {
      setFilteredItems(items);
      return;
    }
    const lower = text.toLowerCase();
    const filtered = items.filter(
      (item) =>
        item.food?.name.toLowerCase().includes(lower) ||
        item.food?.brand?.toLowerCase().includes(lower)
    );
    setFilteredItems(filtered);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Purge Item', `Remove ${name} from your active vault?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Purge',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePantryItem(id);
            setItems((prev) => prev.filter((i) => i.id !== id));
            setFilteredItems((prev) => prev.filter((i) => i.id !== id));
          } catch (err: any) {
            Alert.alert('Error', 'Failed to remove item.');
          }
        },
      },
    ]);
  };

  const totalVaultProtein = items.reduce((acc, item) => {
    const p100 = item.food?.protein_per_100g || 0;
    const qty = item.quantity_remaining || 0;
    return acc + (p100 * (qty / 100));
  }, 0);

  const getProteinAudit = () => {
    if (totalVaultProtein > 500) {
      return { 
        status: 'OPTIMAL RESERVES', 
        color: theme.colors.fat, 
        bg: theme.colors.fatBg,
        text: 'Robust stock of muscle-building staples. Ready for intense hypertrophy phase.' 
      };
    } else if (totalVaultProtein > 200) {
      return { 
        status: 'MODERATE RESERVES', 
        color: theme.colors.carbs, 
        bg: theme.colors.carbsBg,
        text: 'Adequate protein reserves. Consider adding chicken breast, eggs, or fish.' 
      };
    }
    return { 
      status: 'DEFICIENT RESERVES', 
      color: theme.colors.protein, 
      bg: theme.colors.proteinBg,
      text: 'Low protein stock in inventory. High probability of missing daily hypertrophy goals.' 
    };
  };

  const audit = getProteinAudit();

  const renderItem = ({ item }: { item: PantryItemResponse }) => {
    const food = item.food;
    const proteinDensity = food?.protein_per_100g || 0;
    const isHighProtein = proteinDensity >= 15;

    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <Text style={[styles.itemName, { color: theme.colors.textPrimary }]}>{food?.name || 'Unknown Item'}</Text>
              {isHighProtein && (
                <View style={[styles.highProteinBadge, { backgroundColor: theme.colors.proteinBg, borderColor: theme.colors.protein }]}>
                  <Text style={[styles.highProteinText, { color: theme.colors.protein }]}>HIGH PROTEIN</Text>
                </View>
              )}
            </View>
            {food?.brand ? (
              <Text style={[styles.itemBrand, { color: theme.colors.textSecondary }]}>{food.brand}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id, food?.name || 'Item')}
          >
            <Ionicons name="trash-outline" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.stockRow}>
          <Ionicons name="cube-outline" size={13} color={theme.colors.textSecondary} />
          <Text style={[styles.stockText, { color: theme.colors.textSecondary }]}>
            Stock: <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>{item.quantity_remaining} {item.unit}</Text>
          </Text>
        </View>

        {/* Macro Quadrant */}
        <View style={styles.macroPillRow}>
          <View style={[styles.macroPill, { backgroundColor: theme.colors.proteinBg }]}>
            <Text style={[styles.macroVal, { color: theme.colors.protein }]}>{food?.protein_per_100g || 0}g</Text>
            <Text style={[styles.macroSub, { color: theme.colors.protein }]}>Protein</Text>
          </View>
          <View style={[styles.macroPill, { backgroundColor: theme.colors.carbsBg }]}>
            <Text style={[styles.macroVal, { color: theme.colors.carbs }]}>{food?.carbs_per_100g || 0}g</Text>
            <Text style={[styles.macroSub, { color: theme.colors.carbs }]}>Carbs</Text>
          </View>
          <View style={[styles.macroPill, { backgroundColor: theme.colors.fatBg }]}>
            <Text style={[styles.macroVal, { color: theme.colors.fat }]}>{food?.fat_per_100g || 0}g</Text>
            <Text style={[styles.macroSub, { color: theme.colors.fat }]}>Fat</Text>
          </View>
          <View style={[styles.macroPill, { backgroundColor: theme.colors.surfaceSecondary }]}>
            <Text style={[styles.macroVal, { color: theme.colors.textPrimary }]}>{food?.calories_per_100g || 0}</Text>
            <Text style={[styles.macroSub, { color: theme.colors.textSecondary }]}>kcal/100g</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.screenTitle, { color: theme.colors.textMuted }]}>NUTRIENT VAULT</Text>
          <Text style={[styles.screenSub, { color: theme.colors.textPrimary }]}>{items.length} staples in stock</Text>
        </View>
        <TouchableOpacity
          style={[styles.configBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => setShowGoalsModal(true)}
        >
          <Ionicons name="options-outline" size={15} color={theme.colors.textPrimary} />
          <Text style={[styles.configBtnText, { color: theme.colors.textPrimary }]}>Targets</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadPantry();
            }}
            tintColor={theme.colors.accent}
          />
        }
      >
        {/* Protein Audit Card */}
        <View style={[styles.auditCard, { borderColor: audit.color, backgroundColor: audit.bg }]}>
          <View style={styles.auditHeader}>
            <Ionicons name="sparkles" size={16} color={audit.color} />
            <Text style={[styles.auditTitle, { color: audit.color }]}>
              {audit.status}
            </Text>
          </View>
          <Text style={[styles.auditDesc, { color: theme.colors.textSecondary }]}>{audit.text}</Text>
          <View style={[styles.auditStockPill, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.auditStockText, { color: theme.colors.textSecondary }]}>
              Estimated Vault Reserve: <Text style={{ color: theme.colors.textPrimary, fontWeight: '800' }}>{Math.round(totalVaultProtein)}g Protein</Text>
            </Text>
          </View>
        </View>

        {/* Search Field */}
        <View style={[styles.searchWrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Ionicons name="search" size={16} color={theme.colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder="Search vault staples..."
            placeholderTextColor={theme.colors.textMuted}
            value={search}
            onChangeText={handleSearch}
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        </View>

        {/* Inventory List */}
        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={theme.colors.accent} />
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="layers-outline" size={48} color={theme.colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>Vault is Empty</Text>
            <Text style={[styles.emptySub, { color: theme.colors.textSecondary }]}>
              {search ? 'No matching products found.' : 'Scan a barcode to log pantry staples.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            scrollEnabled={false}
          />
        )}
      </ScrollView>

      {/* Biometrics & Goals Modal */}
      <Modal visible={showGoalsModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalShade}>
          <View style={[styles.modalSheet, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.colors.textPrimary }]}>HYPERTROPHY TARGETS</Text>
              <TouchableOpacity onPress={() => setShowGoalsModal(false)}>
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Current Body Weight (kg)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.surfaceSecondary, color: theme.colors.textPrimary }]}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              value={weight}
              onChangeText={setWeight}
              placeholderTextColor={theme.colors.textMuted}
            />

            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Target Weight (kg)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.surfaceSecondary, color: theme.colors.textPrimary }]}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              value={targetWeight}
              onChangeText={setTargetWeight}
              placeholderTextColor={theme.colors.textMuted}
            />

            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Height (cm)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.surfaceSecondary, color: theme.colors.textPrimary }]}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              value={height}
              onChangeText={setHeight}
              placeholderTextColor={theme.colors.textMuted}
            />

            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Daily Protein Target (g)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.colors.surfaceSecondary, color: theme.colors.textPrimary }]}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={() => Keyboard.dismiss()}
              value={proteinGoal}
              onChangeText={setProteinGoal}
              placeholderTextColor={theme.colors.textMuted}
            />

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.colors.accent }]}
              onPress={() => {
                Keyboard.dismiss();
                Alert.alert('Updated', 'Hypertrophy biometric goals saved.');
                setShowGoalsModal(false);
              }}
            >
              <Text style={[styles.saveBtnText, { color: theme.colors.accentText }]}>Save Goals</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  screenTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  screenSub: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  configBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  configBtnText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  auditCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  auditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  auditTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginLeft: 6,
  },
  auditDesc: {
    fontSize: 11.5,
    lineHeight: 15,
    marginBottom: 8,
  },
  auditStockPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  auditStockText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 10,
  },
  centerWrap: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyWrap: {
    paddingVertical: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  itemName: {
    fontSize: 13.5,
    fontWeight: '800',
    marginRight: 6,
  },
  highProteinBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  highProteinText: {
    fontSize: 8.5,
    fontWeight: '800',
  },
  itemBrand: {
    fontSize: 11,
    marginTop: 2,
  },
  deleteButton: {
    padding: 4,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stockText: {
    fontSize: 11,
    marginLeft: 6,
  },
  macroPillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroPill: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  macroVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  macroSub: {
    fontSize: 8,
    marginTop: 1,
    fontWeight: '600',
  },
  modalShade: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 1,
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
  saveBtn: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
});