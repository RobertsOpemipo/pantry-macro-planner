import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchPantryItems,
  createRecipe,
  cookRecipeBatch,
  PantryItemResponse,
  RecipeDetail,
} from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface RecipeScreenProps {
  onBack: () => void;
  onCookSuccess: () => void;
}

const AI_RECIPE_DATABASE = [
  [
    {
      meal: 'BREAKFAST',
      title: 'High-Protein Oats & Egg Scramble',
      protein: '48g Protein',
      cals: '540 kcal',
      desc: 'Rolled oats with peanut butter, paired with a 4-egg white scramble and mackerel.',
    },
    {
      meal: 'LUNCH',
      title: 'Party Jollof & Grilled Chicken Breast',
      protein: '68g Protein',
      cals: '710 kcal',
      desc: 'Portion of party jollof (220g) paired with 250g grilled chicken breast and dodo.',
    },
    {
      meal: 'DINNER',
      title: 'Pounded Yam & Efo Riro with Lean Beef',
      protein: '62g Protein',
      cals: '760 kcal',
      desc: 'Pounded yam served in spinach efo riro packed with lean beef and tripe (shaki).',
    },
  ],
  [
    {
      meal: 'BREAKFAST',
      title: 'Protein Akara & Greek Yogurt Bowl',
      protein: '44g Protein',
      cals: '490 kcal',
      desc: 'Air-fried bean cakes (Akara) paired with plain Greek yogurt for sustained morning amino flow.',
    },
    {
      meal: 'LUNCH',
      title: 'Catfish Pepper Soup & Boiled Plantain',
      protein: '58g Protein',
      cals: '580 kcal',
      desc: 'Fresh catfish steak poached in pepper soup herbs, paired with boiled plantain fingers.',
    },
    {
      meal: 'DINNER',
      title: 'Gizdodo & Basmati Native Rice Bowl',
      protein: '56g Protein',
      cals: '690 kcal',
      desc: 'High-protein gizzard stewed with bell peppers and plantains, served over native rice.',
    },
  ],
];

type VaultFilter = 'all' | 'protein' | 'carbs' | 'lowfat';

export default function RecipeScreen({ onBack, onCookSuccess }: RecipeScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [pantryItems, setPantryItems] = useState<PantryItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'builder' | 'ai_ideas'>('builder');

  const [title, setTitle] = useState('');
  const [servings, setServings] = useState('4');
  const [searchVault, setSearchVault] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<VaultFilter>('all');

  const [selectedIngredients, setSelectedIngredients] = useState<
    {
      food_id: string;
      food_name: string;
      amount: string;
      unit: string;
      protein_per_100g: number;
      calories_per_100g: number;
    }[]
  >([]);

  const [savedRecipe, setSavedRecipe] = useState<RecipeDetail | null>(null);
  const [cooking, setCooking] = useState(false);
  const [ideaIndex, setIdeaIndex] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchPantryItems();
        setPantryItems(data || []);
      } catch (e: any) {
        Alert.alert('Error', 'Could not load vault inventory.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const addIngredient = (item: PantryItemResponse) => {
    if (selectedIngredients.some((i) => i.food_id === item.food_id)) {
      return;
    }
    setSelectedIngredients([
      ...selectedIngredients,
      {
        food_id: item.food_id,
        food_name: item.food?.name || 'Item',
        amount: '100',
        unit: item.unit || 'g',
        protein_per_100g: item.food?.protein_per_100g || 0,
        calories_per_100g: item.food?.calories_per_100g || 0,
      },
    ]);
  };

  const updateAmount = (foodId: string, val: string) => {
    setSelectedIngredients((prev) =>
      prev.map((i) => (i.food_id === foodId ? { ...i, amount: val } : i))
    );
  };

  const adjustGrams = (foodId: string, delta: number) => {
    setSelectedIngredients((prev) =>
      prev.map((i) => {
        if (i.food_id === foodId) {
          const current = parseFloat(i.amount) || 0;
          const updated = Math.max(10, current + delta);
          return { ...i, amount: updated.toString() };
        }
        return i;
      })
    );
  };

  const removeIngredient = (foodId: string) => {
    setSelectedIngredients((prev) => prev.filter((i) => i.food_id !== foodId));
  };

  const numServings = parseInt(servings, 10) || 1;
  const liveTotalCals = selectedIngredients.reduce(
    (acc, i) => acc + (i.calories_per_100g * (parseFloat(i.amount) || 0)) / 100,
    0
  );
  const liveTotalProtein = selectedIngredients.reduce(
    (acc, i) => acc + (i.protein_per_100g * (parseFloat(i.amount) || 0)) / 100,
    0
  );

  const filteredVault = pantryItems.filter((item) => {
    const food = item.food;
    const matchesSearch = food?.name.toLowerCase().includes(searchVault.toLowerCase()) ||
      food?.brand?.toLowerCase().includes(searchVault.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedFilter === 'protein') return (food?.protein_per_100g || 0) >= 15;
    if (selectedFilter === 'carbs') return (food?.carbs_per_100g || 0) >= 20;
    if (selectedFilter === 'lowfat') return (food?.fat_per_100g || 0) <= 5;
    return true;
  });

  const handleCreateRecipe = async () => {
    Keyboard.dismiss();
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a batch recipe title.');
      return;
    }
    if (selectedIngredients.length === 0) {
      Alert.alert('No Ingredients', 'Please select at least one component from your vault.');
      return;
    }

    try {
      setLoading(true);
      const recipe = await createRecipe({
        title: title.trim(),
        servings: numServings,
        ingredients: selectedIngredients.map((ing) => ({
          food_id: ing.food_id,
          amount: parseFloat(ing.amount) || 0,
          unit: ing.unit,
        })),
      });
      setSavedRecipe(recipe);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to calculate batch macros.');
    } finally {
      setLoading(false);
    }
  };

  const handleCookBatch = async () => {
    Keyboard.dismiss();
    if (!savedRecipe) return;
    setCooking(true);
    try {
      await cookRecipeBatch(savedRecipe.id, 1);
      Alert.alert(
        'Batch Cooked!',
        `Deducted components for "${savedRecipe.title}" (${savedRecipe.servings} portions) from your inventory.`,
        [{ text: 'Return to Core', onPress: onCookSuccess }]
      );
    } catch (err: any) {
      Alert.alert('Synthesis Error', err.response?.data?.error || 'Could not deduct components.');
    } finally {
      setCooking(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.colors.textMuted }]}>BATCH PREP LAB</Text>
          <Text style={[styles.headerSub, { color: theme.colors.textPrimary }]}>Dynamic recipe scaling & portion macros</Text>
        </View>
      </View>

      {/* Mode Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: theme.colors.surfaceSecondary }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'builder' && [styles.tabButtonActive, { backgroundColor: theme.colors.surface }],
          ]}
          onPress={() => setActiveTab('builder')}
        >
          <Text
            style={[
              styles.tabButtonText,
              { color: activeTab === 'builder' ? theme.colors.textPrimary : theme.colors.textSecondary },
            ]}
          >
            Recipe Builder
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'ai_ideas' && [styles.tabButtonActive, { backgroundColor: theme.colors.surface }],
          ]}
          onPress={() => setActiveTab('ai_ideas')}
        >
          <Text
            style={[
              styles.tabButtonText,
              { color: activeTab === 'ai_ideas' ? theme.colors.textPrimary : theme.colors.textSecondary },
            ]}
          >
            AI Protein Ideas
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {activeTab === 'builder' ? (
          <>
            {/* Live Macro Heads-Up Bar */}
            {selectedIngredients.length > 0 && (
              <View style={[styles.macroBanner, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={styles.macroBannerCol}>
                  <Text style={[styles.bannerSub, { color: theme.colors.textMuted }]}>TOTAL BATCH</Text>
                  <Text style={[styles.bannerVal, { color: theme.colors.textPrimary }]}>{Math.round(liveTotalCals)} kcal</Text>
                </View>
                <View style={[styles.bannerDivider, { backgroundColor: theme.colors.border }]} />
                <View style={styles.macroBannerCol}>
                  <Text style={[styles.bannerSub, { color: theme.colors.protein }]}>PROTEIN / SERVING</Text>
                  <Text style={[styles.bannerVal, { color: theme.colors.protein }]}>
                    {(liveTotalProtein / numServings).toFixed(1)}g
                  </Text>
                </View>
                <View style={[styles.bannerDivider, { backgroundColor: theme.colors.border }]} />
                <View style={styles.macroBannerCol}>
                  <Text style={[styles.bannerSub, { color: theme.colors.textMuted }]}>CALS / SERVING</Text>
                  <Text style={[styles.bannerVal, { color: theme.colors.textPrimary }]}>{Math.round(liveTotalCals / numServings)} kcal</Text>
                </View>
              </View>
            )}

            {/* Title & Servings Setup */}
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Recipe / Pot Title</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.colors.surfaceSecondary, color: theme.colors.textPrimary }]}
                placeholder="e.g. 4-Day High Protein Native Rice"
                placeholderTextColor={theme.colors.textMuted}
                value={title}
                onChangeText={setTitle}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                <View>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Meal Prep Portions</Text>
                  <Text style={[styles.inputSub, { color: theme.colors.textMuted }]}>Evenly divides overall macros</Text>
                </View>
                <View style={[styles.stepperWrap, { backgroundColor: theme.colors.surfaceSecondary }]}>
                  <TouchableOpacity
                    style={[styles.stepperButton, { backgroundColor: theme.colors.surface }]}
                    onPress={() => setServings(Math.max(1, numServings - 1).toString())}
                  >
                    <Ionicons name="remove" size={16} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={[styles.stepperNumber, { color: theme.colors.textPrimary }]}>{numServings}</Text>
                  <TouchableOpacity
                    style={[styles.stepperButton, { backgroundColor: theme.colors.surface }]}
                    onPress={() => setServings((numServings + 1).toString())}
                  >
                    <Ionicons name="add" size={16} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Selected Components */}
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={[styles.cardHeading, { color: theme.colors.textPrimary }]}>Recipe Components</Text>
                <View style={[styles.countBadge, { backgroundColor: theme.colors.surfaceSecondary }]}>
                  <Text style={[styles.countBadgeText, { color: theme.colors.textSecondary }]}>{selectedIngredients.length} Added</Text>
                </View>
              </View>

              {selectedIngredients.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="nutrition-outline" size={26} color={theme.colors.textMuted} />
                  <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Tap staples from your vault below to add them to this pot.</Text>
                </View>
              ) : (
                selectedIngredients.map((ing) => (
                  <View key={ing.food_id} style={[styles.componentRow, { borderBottomColor: theme.colors.surfaceSecondary }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.compTitle, { color: theme.colors.textPrimary }]}>{ing.food_name}</Text>
                      <Text style={[styles.compSub, { color: theme.colors.textSecondary }]}>
                        {((ing.protein_per_100g * (parseFloat(ing.amount) || 0)) / 100).toFixed(1)}g protein •{' '}
                        {Math.round((ing.calories_per_100g * (parseFloat(ing.amount) || 0)) / 100)} kcal
                      </Text>
                    </View>

                    <View style={styles.gramControls}>
                      <TouchableOpacity style={[styles.adjustPill, { backgroundColor: theme.colors.surfaceSecondary }]} onPress={() => adjustGrams(ing.food_id, -50)}>
                        <Text style={[styles.adjustText, { color: theme.colors.textSecondary }]}>-50</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={[styles.gramInput, { backgroundColor: theme.colors.surfaceSecondary, color: theme.colors.textPrimary }]}
                        keyboardType="numeric"
                        returnKeyType="done"
                        onSubmitEditing={() => Keyboard.dismiss()}
                        value={ing.amount}
                        onChangeText={(val) => updateAmount(ing.food_id, val)}
                      />
                      <Text style={[styles.gramUnit, { color: theme.colors.textMuted }]}>{ing.unit}</Text>
                      <TouchableOpacity style={[styles.adjustPill, { backgroundColor: theme.colors.surfaceSecondary }]} onPress={() => adjustGrams(ing.food_id, 50)}>
                        <Text style={[styles.adjustText, { color: theme.colors.textSecondary }]}>+50</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteButton} onPress={() => removeIngredient(ing.food_id)}>
                        <Ionicons name="trash-outline" size={16} color={theme.colors.protein} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Nutrient Vault Inventory Selector */}
            <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.vaultHeader}>
                <Text style={[styles.cardHeading, { color: theme.colors.textPrimary }]}>Add From Nutrient Vault</Text>
                <Text style={[styles.vaultCount, { color: theme.colors.textMuted }]}>{filteredVault.length} staples</Text>
              </View>

              {/* Search Bar */}
              <View style={[styles.searchBar, { backgroundColor: theme.colors.surfaceSecondary }]}>
                <Ionicons name="search" size={16} color={theme.colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchInput, { color: theme.colors.textPrimary }]}
                  placeholder="Search staples (Rice, Chicken, Yam)..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={searchVault}
                  onChangeText={setSearchVault}
                  returnKeyType="search"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>

              {/* Filter Pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    { backgroundColor: selectedFilter === 'all' ? theme.colors.accent : theme.colors.surfaceSecondary },
                  ]}
                  onPress={() => setSelectedFilter('all')}
                >
                  <Text style={[styles.filterChipText, { color: selectedFilter === 'all' ? theme.colors.accentText : theme.colors.textSecondary }]}>
                    All Staples
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    { backgroundColor: selectedFilter === 'protein' ? theme.colors.accent : theme.colors.surfaceSecondary },
                  ]}
                  onPress={() => setSelectedFilter('protein')}
                >
                  <Text style={[styles.filterChipText, { color: selectedFilter === 'protein' ? theme.colors.accentText : theme.colors.textSecondary }]}>
                    High Protein (≥15g)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    { backgroundColor: selectedFilter === 'carbs' ? theme.colors.accent : theme.colors.surfaceSecondary },
                  ]}
                  onPress={() => setSelectedFilter('carbs')}
                >
                  <Text style={[styles.filterChipText, { color: selectedFilter === 'carbs' ? theme.colors.accentText : theme.colors.textSecondary }]}>
                    Carbs
                  </Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Vault Item Cards */}
              <View style={styles.vaultList}>
                {filteredVault.map((item) => {
                  const isAdded = selectedIngredients.some((i) => i.food_id === item.food_id);
                  const food = item.food;

                  return (
                    <View key={item.id} style={[styles.vaultItem, isAdded && { opacity: 0.6 }, { borderBottomColor: theme.colors.surfaceSecondary }]}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={[styles.vaultItemTitle, { color: theme.colors.textPrimary }]}>{food?.name}</Text>
                        <Text style={[styles.vaultItemMeta, { color: theme.colors.textSecondary }]}>
                          {food?.protein_per_100g}g protein • {food?.calories_per_100g} kcal/100g
                        </Text>
                        <Text style={[styles.vaultStock, { color: theme.colors.textMuted }]}>Stock: {item.quantity_remaining}{item.unit}</Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.addButton,
                          { backgroundColor: isAdded ? theme.colors.fatBg : theme.colors.accent },
                        ]}
                        onPress={() => addIngredient(item)}
                        disabled={isAdded}
                      >
                        {isAdded ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="checkmark" size={14} color={theme.colors.fat} style={{ marginRight: 3 }} />
                            <Text style={[styles.addButtonTextDone, { color: theme.colors.fat }]}>Added</Text>
                          </View>
                        ) : (
                          <Text style={[styles.addButtonText, { color: theme.colors.accentText }]}>Add</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[styles.primaryActionButton, { backgroundColor: theme.colors.accent }]}
              onPress={handleCreateRecipe}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.accentText} size="small" />
              ) : (
                <Text style={[styles.primaryActionText, { color: theme.colors.accentText }]}>Calculate Batch Macros</Text>
              )}
            </TouchableOpacity>

            {/* Result Confirmation Card */}
            {savedRecipe && (
              <View style={[styles.resultCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.resultTitle, { color: theme.colors.textPrimary }]}>{savedRecipe.title}</Text>
                <Text style={[styles.resultSub, { color: theme.colors.textSecondary }]}>{savedRecipe.servings} equal containers</Text>

                <View style={[styles.resultMacroGrid, { backgroundColor: theme.colors.surfaceSecondary }]}>
                  <View style={styles.resultMacroCol}>
                    <Text style={[styles.resultVal, { color: theme.colors.textPrimary }]}>{Math.round(savedRecipe.macros.calories_per_serving)}</Text>
                    <Text style={[styles.resultLabel, { color: theme.colors.textMuted }]}>kcal / serving</Text>
                  </View>
                  <View style={styles.resultMacroCol}>
                    <Text style={[styles.resultVal, { color: theme.colors.protein }]}>
                      {savedRecipe.macros.protein_per_serving.toFixed(1)}g
                    </Text>
                    <Text style={[styles.resultLabel, { color: theme.colors.textMuted }]}>Protein</Text>
                  </View>
                  <View style={styles.resultMacroCol}>
                    <Text style={[styles.resultVal, { color: theme.colors.carbs }]}>
                      {savedRecipe.macros.carbs_per_serving.toFixed(1)}g
                    </Text>
                    <Text style={[styles.resultLabel, { color: theme.colors.textMuted }]}>Carbs</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.cookButton, { backgroundColor: theme.colors.fat }]}
                  onPress={handleCookBatch}
                  disabled={cooking}
                >
                  {cooking ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.cookButtonText}>Cook & Auto-Deduct Stock</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          /* AI Protein Ideas Tab */
          <View>
            <View style={styles.aiHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardHeading, { color: theme.colors.textPrimary }]}>Hypertrophy Meal Ideas</Text>
                <Text style={[styles.inputSub, { color: theme.colors.textMuted }]}>Calibrated for high-protein Nigerian diet goals</Text>
              </View>
              <TouchableOpacity
                style={[styles.shuffleButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => setIdeaIndex((prev) => (prev + 1) % AI_RECIPE_DATABASE.length)}
              >
                <Ionicons name="shuffle" size={14} color={theme.colors.textPrimary} style={{ marginRight: 4 }} />
                <Text style={[styles.shuffleText, { color: theme.colors.textPrimary }]}>Shuffle</Text>
              </TouchableOpacity>
            </View>

            {AI_RECIPE_DATABASE[ideaIndex].map((idea, idx) => (
              <View key={idx} style={[styles.ideaCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={styles.ideaTopRow}>
                  <Text style={[styles.ideaMealType, { color: theme.colors.textMuted }]}>{idea.meal}</Text>
                  <View style={[styles.proteinTag, { backgroundColor: theme.colors.proteinBg }]}>
                    <Text style={[styles.proteinTagText, { color: theme.colors.protein }]}>{idea.protein}</Text>
                  </View>
                </View>
                <Text style={[styles.ideaTitle, { color: theme.colors.textPrimary }]}>{idea.title}</Text>
                <Text style={[styles.ideaDesc, { color: theme.colors.textSecondary }]}>{idea.desc}</Text>
                <Text style={[styles.ideaEnergy, { color: theme.colors.textMuted }]}>Energy: {idea.cals}</Text>

                <TouchableOpacity
                  style={[styles.useIdeaButton, { backgroundColor: theme.colors.surfaceSecondary }]}
                  onPress={() => {
                    setTitle(idea.title);
                    setActiveTab('builder');
                    Alert.alert('Loaded', `"${idea.title}" template loaded into Builder!`);
                  }}
                >
                  <Text style={[styles.useIdeaText, { color: theme.colors.textPrimary }]}>Load into Recipe Builder</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    paddingVertical: 10,
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  headerSub: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  macroBanner: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
  },
  macroBannerCol: {
    alignItems: 'center',
  },
  bannerSub: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  bannerVal: {
    fontSize: 15,
    fontWeight: '900',
  },
  bannerDivider: {
    width: 1,
    height: 24,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeading: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputSub: {
    fontSize: 11,
  },
  textInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 13.5,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 3,
  },
  stepperButton: {
    padding: 6,
    borderRadius: 8,
  },
  stepperNumber: {
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 12,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  emptyText: {
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  componentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  compTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  compSub: {
    fontSize: 11,
    marginTop: 2,
  },
  gramControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adjustPill: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  adjustText: {
    fontSize: 10,
    fontWeight: '700',
  },
  gramInput: {
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 6,
    width: 50,
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 12,
    marginHorizontal: 4,
  },
  gramUnit: {
    fontSize: 11,
    marginRight: 6,
  },
  deleteButton: {
    padding: 4,
  },
  vaultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  vaultCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 12.5,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 6,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  vaultList: {
    marginTop: 2,
  },
  vaultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  vaultItemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  vaultItemMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  vaultStock: {
    fontSize: 10.5,
    marginTop: 1,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  addButtonTextDone: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  primaryActionButton: {
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  primaryActionText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  resultCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  resultSub: {
    fontSize: 11,
    marginBottom: 12,
  },
  resultMacroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  resultMacroCol: {
    alignItems: 'center',
  },
  resultVal: {
    fontSize: 15,
    fontWeight: '900',
  },
  resultLabel: {
    fontSize: 9.5,
    marginTop: 1,
  },
  cookButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cookButtonText: {
    color: '#fff',
    fontSize: 12.5,
    fontWeight: '800',
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  shuffleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  ideaCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  ideaTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ideaMealType: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  proteinTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  proteinTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  ideaTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  ideaDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 6,
  },
  ideaEnergy: {
    fontSize: 10.5,
    fontWeight: '600',
    marginBottom: 12,
  },
  useIdeaButton: {
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  useIdeaText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
});