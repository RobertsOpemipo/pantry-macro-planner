import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

type ScreenType = 'home' | 'pantry' | 'scanner' | 'recipe' | 'platescan' | 'analytics';

interface HomeScreenProps {
  onNavigate: (screen: ScreenType) => void;
}

export default function HomeScreen({ onNavigate }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 8 }]}>
      {/* Header with Mode Switcher */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greetingTitle, { color: theme.colors.textPrimary }]}>Onaopemipo Roberts</Text>
          <Text style={[styles.greetingSub, { color: theme.colors.textSecondary }]}>Hypertrophy Focus • Daily Overview</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Theme Toggle Button */}
          <TouchableOpacity
            style={[styles.iconPill, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={toggleTheme}
          >
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={16} color={theme.colors.textPrimary} />
          </TouchableOpacity>

          {/* Streak Indicator */}
          <TouchableOpacity
            style={[styles.streakBadge, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginLeft: 8 }]}
            onPress={() => onNavigate('analytics')}
          >
            <Ionicons name="flame" size={14} color={theme.colors.carbs} />
            <Text style={[styles.streakText, { color: theme.colors.textPrimary }]}>14 Days</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Core Daily Energy Card */}
        <View style={[styles.energyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.energyTopRow}>
            <View>
              <Text style={[styles.cardHeaderSmall, { color: theme.colors.textMuted }]}>DAILY ENERGY BUDGET</Text>
              <Text style={[styles.calorieTotal, { color: theme.colors.textPrimary }]}>
                1,820 <Text style={[styles.calorieGoal, { color: theme.colors.textSecondary }]}>/ 2,450 kcal</Text>
              </Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: theme.colors.surfaceSecondary }]}>
              <Text style={[styles.statusPillText, { color: theme.colors.textSecondary }]}>74% Consumed</Text>
            </View>
          </View>

          <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceSecondary }]}>
            <View style={[styles.progressFill, { width: '74%', backgroundColor: theme.colors.accent }]} />
          </View>
          <Text style={[styles.progressSub, { color: theme.colors.textSecondary }]}>
            630 kcal remaining to reach hypertrophy threshold
          </Text>

          {/* Harmonized Macro Strip */}
          <View style={styles.macroStrip}>
            <View style={[styles.macroBox, { backgroundColor: theme.colors.proteinBg }]}>
              <Text style={[styles.macroLabel, { color: theme.colors.protein }]}>PROTEIN</Text>
              <Text style={[styles.macroAmount, { color: theme.colors.textPrimary }]}>165g</Text>
              <Text style={[styles.macroGoal, { color: theme.colors.textSecondary }]}>Goal: 180g</Text>
            </View>

            <View style={[styles.macroBox, { backgroundColor: theme.colors.carbsBg }]}>
              <Text style={[styles.macroLabel, { color: theme.colors.carbs }]}>CARBS</Text>
              <Text style={[styles.macroAmount, { color: theme.colors.textPrimary }]}>210g</Text>
              <Text style={[styles.macroGoal, { color: theme.colors.textSecondary }]}>Goal: 250g</Text>
            </View>

            <View style={[styles.macroBox, { backgroundColor: theme.colors.fatBg }]}>
              <Text style={[styles.macroLabel, { color: theme.colors.fat }]}>FATS</Text>
              <Text style={[styles.macroAmount, { color: theme.colors.textPrimary }]}>65g</Text>
              <Text style={[styles.macroGoal, { color: theme.colors.textSecondary }]}>Goal: 75g</Text>
            </View>
          </View>
        </View>

        {/* Section Heading */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>MODULES & ENGINES</Text>
        </View>

        {/* Studio Bento Grid */}
        <View style={styles.bentoGrid}>
          <TouchableOpacity
            style={[styles.bentoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => onNavigate('platescan')}
          >
            <View style={[styles.cardIconBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
              <Ionicons name="scan-outline" size={22} color={theme.colors.textPrimary} />
            </View>
            <Text style={[styles.bentoTitle, { color: theme.colors.textPrimary }]}>Plate Vision AI</Text>
            <Text style={[styles.bentoDesc, { color: theme.colors.textSecondary }]}>
              Analyze meal photos and decompose into grams & macros
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bentoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => onNavigate('pantry')}
          >
            <View style={[styles.cardIconBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
              <Ionicons name="layers-outline" size={22} color={theme.colors.textPrimary} />
            </View>
            <Text style={[styles.bentoTitle, { color: theme.colors.textPrimary }]}>Nutrient Vault</Text>
            <Text style={[styles.bentoDesc, { color: theme.colors.textSecondary }]}>
              Track live staple inventory and protein reserves
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bentoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => onNavigate('scanner')}
          >
            <View style={[styles.cardIconBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
              <Ionicons name="barcode-outline" size={22} color={theme.colors.textPrimary} />
            </View>
            <Text style={[styles.bentoTitle, { color: theme.colors.textPrimary }]}>Barcode Matrix</Text>
            <Text style={[styles.bentoDesc, { color: theme.colors.textSecondary }]}>
              Quick scan packaged goods for instant nutritional lookup
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bentoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => onNavigate('recipe')}
          >
            <View style={[styles.cardIconBox, { backgroundColor: theme.colors.surfaceSecondary }]}>
              <Ionicons name="flask-outline" size={22} color={theme.colors.textPrimary} />
            </View>
            <Text style={[styles.bentoTitle, { color: theme.colors.textPrimary }]}>Batch Prep Lab</Text>
            <Text style={[styles.bentoDesc, { color: theme.colors.textSecondary }]}>
              Combine vault staples and calculate multi-portion batches
            </Text>
          </TouchableOpacity>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 8,
  },
  greetingTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  greetingSub: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1,
  },
  streakText: {
    fontSize: 11.5,
    fontWeight: '700',
    marginLeft: 4,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  energyCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
  },
  energyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardHeaderSmall: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
  },
  calorieTotal: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 3,
  },
  calorieGoal: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: 9999,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 9999,
  },
  progressSub: {
    fontSize: 11.5,
    marginBottom: 16,
    fontWeight: '500',
  },
  macroStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroBox: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginHorizontal: 3,
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  macroAmount: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 1,
  },
  macroGoal: {
    fontSize: 9,
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bentoCard: {
    width: '48.5%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  bentoTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    marginBottom: 4,
  },
  bentoDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
});