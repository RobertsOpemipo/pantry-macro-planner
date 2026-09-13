import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('September');
  const [selectedDay, setSelectedDay] = useState(10);

  const years = ['2024', '2025', '2026'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const inspectedCals = 2150 + ((selectedDay * 65) % 550);
  const inspectedProtein = 155 + ((selectedDay * 4) % 35);
  const inspectedCarbs = 210 + ((selectedDay * 7) % 60);
  const inspectedFat = 60 + ((selectedDay * 2) % 20);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.colors.textMuted }]}>PROGRESS & RECAP HUB</Text>
          <Text style={[styles.headerSub, { color: theme.colors.textPrimary }]}>Calendar History & Weight Trajectory</Text>
        </View>

        <View style={[styles.streakBadge, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Ionicons name="flame" size={14} color={theme.colors.carbs} />
          <Text style={[styles.streakText, { color: theme.colors.textPrimary }]}>14 Days</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Year Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorRow}>
          {years.map((yr) => (
            <TouchableOpacity
              key={yr}
              style={[
                styles.selectorPill,
                {
                  backgroundColor: selectedYear === yr ? theme.colors.accent : theme.colors.surface,
                  borderColor: selectedYear === yr ? theme.colors.accent : theme.colors.border,
                },
              ]}
              onPress={() => setSelectedYear(yr)}
            >
              <Text
                style={[
                  styles.selectorText,
                  { color: selectedYear === yr ? theme.colors.accentText : theme.colors.textSecondary },
                ]}
              >
                {yr}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Month Selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.selectorRow, { marginTop: 8 }]}>
          {months.map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                styles.selectorPill,
                {
                  backgroundColor: selectedMonth === m ? theme.colors.accent : theme.colors.surface,
                  borderColor: selectedMonth === m ? theme.colors.accent : theme.colors.border,
                },
              ]}
              onPress={() => setSelectedMonth(m)}
            >
              <Text
                style={[
                  styles.selectorText,
                  { color: selectedMonth === m ? theme.colors.accentText : theme.colors.textSecondary },
                ]}
              >
                {m}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Real-time Day Inspection Card */}
        <View style={[styles.inspectCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.inspectHeader}>
            <View>
              <Text style={[styles.inspectLabel, { color: theme.colors.textMuted }]}>INSPECTED ENTRY</Text>
              <Text style={[styles.inspectDate, { color: theme.colors.textPrimary }]}>
                {selectedMonth} {selectedDay}, {selectedYear}
              </Text>
            </View>
            <View style={[styles.statusPill, { backgroundColor: theme.colors.fatBg }]}>
              <View style={[styles.statusDot, { backgroundColor: theme.colors.fat }]} />
              <Text style={[styles.statusPillText, { color: theme.colors.fat }]}>Surplus Hit</Text>
            </View>
          </View>

          {/* Macro Breakdown Quadrant */}
          <View style={styles.macroQuadrant}>
            <View style={[styles.macroItem, { backgroundColor: theme.colors.surfaceSecondary }]}>
              <Text style={[styles.macroVal, { color: theme.colors.textPrimary }]}>{inspectedCals}</Text>
              <Text style={[styles.macroSub, { color: theme.colors.textSecondary }]}>Calories (kcal)</Text>
            </View>
            <View style={[styles.macroItem, { backgroundColor: theme.colors.proteinBg }]}>
              <Text style={[styles.macroVal, { color: theme.colors.protein }]}>{inspectedProtein}g</Text>
              <Text style={[styles.macroSub, { color: theme.colors.protein }]}>Protein</Text>
            </View>
            <View style={[styles.macroItem, { backgroundColor: theme.colors.carbsBg }]}>
              <Text style={[styles.macroVal, { color: theme.colors.carbs }]}>{inspectedCarbs}g</Text>
              <Text style={[styles.macroSub, { color: theme.colors.carbs }]}>Carbs</Text>
            </View>
            <View style={[styles.macroItem, { backgroundColor: theme.colors.fatBg }]}>
              <Text style={[styles.macroVal, { color: theme.colors.fat }]}>{inspectedFat}g</Text>
              <Text style={[styles.macroSub, { color: theme.colors.fat }]}>Fats</Text>
            </View>
          </View>
        </View>

        {/* 7-Column Calendar Grid */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.colors.textMuted }]}>MONTHLY CALORIC MATRIX</Text>
            <Text style={[styles.cardHelper, { color: theme.colors.textMuted }]}>Tap day to inspect</Text>
          </View>

          <View style={[styles.weekdayRow, { borderBottomColor: theme.colors.surfaceSecondary }]}>
            {weekDays.map((d, i) => (
              <Text key={i} style={[styles.weekdayText, { color: theme.colors.textMuted }]}>{d}</Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {Array.from({ length: 30 }).map((_, idx) => {
              const dayNum = idx + 1;
              const cals = 2150 + ((dayNum * 65) % 550);
              const isSelected = selectedDay === dayNum;
              const isPeak = cals > 2500;

              return (
                <TouchableOpacity
                  key={dayNum}
                  style={[
                    styles.calCell,
                    {
                      backgroundColor: isSelected ? theme.colors.accent : theme.colors.surfaceSecondary,
                    },
                  ]}
                  onPress={() => setSelectedDay(dayNum)}
                >
                  <Text
                    style={[
                      styles.calDayNum,
                      { color: isSelected ? theme.colors.accentText : theme.colors.textPrimary },
                    ]}
                  >
                    {dayNum}
                  </Text>
                  <Text
                    style={[
                      styles.calCalories,
                      { color: isSelected ? theme.colors.accentText : theme.colors.textSecondary },
                    ]}
                  >
                    {Math.round(cals / 100) / 10}k
                  </Text>
                  {isPeak && !isSelected && (
                    <View style={[styles.peakIndicator, { backgroundColor: theme.colors.fat }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Weight Trajectory Graph */}
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: theme.colors.textMuted }]}>WEIGHT PROGRESSION</Text>
            <Text style={[styles.gainText, { color: theme.colors.fat }]}>+1.4 kg gain</Text>
          </View>
          <Text style={[styles.cardSub, { color: theme.colors.textSecondary }]}>Target: 78.0 kg • Current: 73.4 kg</Text>

          <View style={[styles.graphContainer, { backgroundColor: theme.colors.surfaceSecondary }]}>
            {([
              { week: 'W1', val: '72.0 kg', height: '35%' },
              { week: 'W2', val: '72.5 kg', height: '50%' },
              { week: 'W3', val: '73.0 kg', height: '65%' },
              { week: 'W4', val: '73.4 kg', height: '85%' },
            ] as const).map((item, idx) => (
              <View key={idx} style={styles.graphCol}>
                <Text style={[styles.graphValText, { color: theme.colors.textPrimary }]}>{item.val}</Text>
                <View style={[styles.barTrack, { backgroundColor: theme.colors.border }]}>
                  <View style={[styles.barFill, { height: item.height, backgroundColor: theme.colors.accent }]} />
                </View>
                <Text style={[styles.graphLabelText, { color: theme.colors.textSecondary }]}>{item.week}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Peak & Leaderboard Cards */}
        <View style={styles.dualCardRow}>
          <View style={[styles.halfCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.cardIconSmall, { backgroundColor: theme.colors.surfaceSecondary }]}>
              <Ionicons name="flame-outline" size={18} color={theme.colors.carbs} />
            </View>
            <Text style={[styles.leaderLabel, { color: theme.colors.textMuted }]}>PEAK INTAKE</Text>
            <Text style={[styles.leaderValue, { color: theme.colors.textPrimary }]}>2,740 kcal</Text>
            <Text style={[styles.leaderSub, { color: theme.colors.textSecondary }]}>Recorded on Sep 8</Text>
          </View>

          <View style={[styles.halfCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.cardIconSmall, { backgroundColor: theme.colors.surfaceSecondary }]}>
              <Ionicons name="restaurant-outline" size={18} color={theme.colors.fat} />
            </View>
            <Text style={[styles.leaderLabel, { color: theme.colors.textMuted }]}>TOP STAPLE</Text>
            <Text style={[styles.leaderValue, { color: theme.colors.textPrimary }]} numberOfLines={1}>Party Jollof</Text>
            <Text style={[styles.leaderSub, { color: theme.colors.textSecondary }]}>Logged 18 times</Text>
          </View>
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
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
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
  selectorRow: {
    marginBottom: 4,
  },
  selectorPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    marginRight: 6,
    borderWidth: 1,
  },
  selectorText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  inspectCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  inspectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  inspectLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1,
  },
  inspectDate: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  macroQuadrant: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroItem: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  macroVal: {
    fontSize: 14,
    fontWeight: '900',
  },
  macroSub: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardHelper: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardSub: {
    fontSize: 11.5,
    marginBottom: 14,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  weekdayText: {
    width: '13%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  calCell: {
    width: '13%',
    borderRadius: 8,
    paddingVertical: 8,
    marginBottom: 8,
    alignItems: 'center',
    position: 'relative',
  },
  calDayNum: {
    fontSize: 11,
    fontWeight: '800',
  },
  calCalories: {
    fontSize: 8.5,
    fontWeight: '600',
    marginTop: 2,
  },
  peakIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  gainText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  graphContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    borderRadius: 12,
    padding: 12,
  },
  graphCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  graphValText: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 6,
  },
  barTrack: {
    width: 22,
    height: '65%',
    borderRadius: 6,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  graphLabelText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
  },
  dualCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfCard: {
    width: '48.5%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  cardIconSmall: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  leaderLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  leaderValue: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },
  leaderSub: {
    fontSize: 11,
  },
});