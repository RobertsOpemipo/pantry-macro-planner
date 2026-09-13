import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, ActivityIndicator, Text, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getAuthToken, saveAuthToken } from './src/services/storage';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

import HomeScreen from './src/screens/HomeScreen';
import PantryScreen from './src/screens/PantryScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import RecipeScreen from './src/screens/RecipeScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import PlateScanScreen from './src/screens/PlateScanScreen';

type ScreenType = 'home' | 'pantry' | 'scanner' | 'recipe' | 'platescan' | 'analytics';

function MainNavigator() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [authReady, setAuthReady] = useState(false);
  const { theme, isDark } = useTheme();

  useEffect(() => {
  async function checkSession() {
    try {
      let token = await getAuthToken();
      if (!token) {
        const devToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNmM3MmQyMGQtMTcyYi00MGZhLWI2YzMtYjg4MWI5MWYzODgwIiwiZW1haWwiOiJ0ZXN0ZXJAcGFudHJ5LmNvbSIsImV4cCI6MTc4OTE1MzU5NywiaWF0IjoxNzg4ODk0Mzk3fQ.ctbhtz9R8gruCKEhzXYCpXd6OmV3Q42qWDU8xk4-tF4';
        await saveAuthToken(devToken);
      }
    } catch (e) {
      console.warn('SecureStore init bypassed:', e);
    } finally {
      // Guarantees the UI renders even if SecureStore errors out
      setAuthReady(true);
    }
  }
  checkSession();
}, []);

  if (!authReady) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.mainWrapper, { backgroundColor: theme.colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.bg} />

      <View style={styles.screenContainer}>
        {currentScreen === 'home' && <HomeScreen onNavigate={(screen) => setCurrentScreen(screen)} />}
        {currentScreen === 'pantry' && <PantryScreen onNavigate={(screen) => setCurrentScreen(screen)} />}
        {currentScreen === 'scanner' && <ScannerScreen onCloseScanner={() => setCurrentScreen('home')} />}
        {currentScreen === 'recipe' && (
          <RecipeScreen onBack={() => setCurrentScreen('home')} onCookSuccess={() => setCurrentScreen('home')} />
        )}
        {currentScreen === 'platescan' && (
          <PlateScanScreen onBack={() => setCurrentScreen('home')} onLogMealSuccess={() => setCurrentScreen('home')} />
        )}
        {currentScreen === 'analytics' && <AnalyticsScreen />}
      </View>

      {/* 5-Tab Studio Navigation Bar */}
      <View style={[styles.bottomNav, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('home')}>
          <Ionicons
            name={currentScreen === 'home' ? 'grid' : 'grid-outline'}
            size={20}
            color={currentScreen === 'home' ? theme.colors.textPrimary : theme.colors.textMuted}
          />
          <Text style={[styles.navText, { color: currentScreen === 'home' ? theme.colors.textPrimary : theme.colors.textMuted }]}>
            Core
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('pantry')}>
          <Ionicons
            name={currentScreen === 'pantry' ? 'layers' : 'layers-outline'}
            size={20}
            color={currentScreen === 'pantry' ? theme.colors.textPrimary : theme.colors.textMuted}
          />
          <Text style={[styles.navText, { color: currentScreen === 'pantry' ? theme.colors.textPrimary : theme.colors.textMuted }]}>
            Vault
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('platescan')}>
          <Ionicons
            name="scan-circle"
            size={24}
            color={currentScreen === 'platescan' ? theme.colors.textPrimary : theme.colors.textMuted}
          />
          <Text style={[styles.navText, { color: currentScreen === 'platescan' ? theme.colors.textPrimary : theme.colors.textMuted }]}>
            Vision
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('recipe')}>
          <Ionicons
            name={currentScreen === 'recipe' ? 'flask' : 'flask-outline'}
            size={20}
            color={currentScreen === 'recipe' ? theme.colors.textPrimary : theme.colors.textMuted}
          />
          <Text style={[styles.navText, { color: currentScreen === 'recipe' ? theme.colors.textPrimary : theme.colors.textMuted }]}>
            Lab
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentScreen('analytics')}>
          <Ionicons
            name={currentScreen === 'analytics' ? 'stats-chart' : 'stats-chart-outline'}
            size={20}
            color={currentScreen === 'analytics' ? theme.colors.textPrimary : theme.colors.textMuted}
          />
          <Text style={[styles.navText, { color: currentScreen === 'analytics' ? theme.colors.textPrimary : theme.colors.textMuted }]}>
            Recap
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MainNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainWrapper: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 65,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    zIndex: 100,
    paddingHorizontal: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 9.5,
    fontWeight: '700',
    marginTop: 3,
  },
});