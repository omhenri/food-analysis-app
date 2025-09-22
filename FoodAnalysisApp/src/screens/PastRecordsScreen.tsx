import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Day, Week, FoodEntry } from '../models/types';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import { DatabaseService } from '../services/DatabaseService';

type RecordsStackParamList = {
  PastRecords: undefined;
  DayDetail: { day: Day };
  WeeklyReport: { weekId: number };
};

type PastRecordsScreenNavigationProp = StackNavigationProp<RecordsStackParamList, 'PastRecords'>;

interface DayWithData extends Day {
  foodCount: number;
  hasAnalysis: boolean;
}

export const PastRecordsScreen: React.FC = () => {
  const navigation = useNavigation<PastRecordsScreenNavigationProp>();
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [daysWithData, setDaysWithData] = useState<DayWithData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const databaseService = DatabaseService.getInstance();

  useEffect(() => {
    initializeData();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('PastRecordsScreen focused - refreshing data');
      initializeData();
    }, [])
  );

  const initializeData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Initialize database
      await databaseService.initializeDatabase();

      // Get all weeks
      const allWeeks = await databaseService.getAllWeeks();
      setWeeks(allWeeks);

      // Get all days with their data counts
      const allDaysWithData: DayWithData[] = [];
      
      for (const week of allWeeks) {
        const weekDays = await databaseService.getDaysForWeek(week.id);
        
        for (const day of weekDays) {
          // Get food entries count for this day
          const foodEntries = await databaseService.getFoodEntriesForDay(day.id);
          const analysisResults = await databaseService.getAnalysisForDay(day.id);
          
          allDaysWithData.push({
            ...day,
            foodCount: foodEntries.length,
            hasAnalysis: analysisResults.length > 0,
          });
        }
      }

      // Sort days by date (most recent first)
      allDaysWithData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setDaysWithData(allDaysWithData);

    } catch (err) {
      console.error('Failed to initialize past records:', err);
      setError(`Failed to load records: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDayPress = (day: DayWithData) => {
    navigation.navigate('DayDetail', { day });
  };

  const handleWeeklyReportPress = (weekId: number) => {
    navigation.navigate('WeeklyReport', { weekId });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    if (dateString === today) {
      return 'Today';
    } else if (dateString === yesterday) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric' 
      });
    }
  };

  const getDayStatusText = (day: DayWithData): string => {
    if (day.foodCount === 0) {
      return 'No food entries';
    } else if (!day.hasAnalysis) {
      return `${day.foodCount} food${day.foodCount !== 1 ? 's' : ''} • Not analyzed`;
    } else {
      return `${day.foodCount} food${day.foodCount !== 1 ? 's' : ''} • Analyzed`;
    }
  };

  const getDayStatusColor = (day: DayWithData): string => {
    if (day.foodCount === 0) {
      return Colors.textSecondary;
    } else if (!day.hasAnalysis) {
      return Colors.warning;
    } else {
      return Colors.success;
    }
  };

  const renderDayItem = ({ item: day }: { item: DayWithData }) => (
    <TouchableOpacity
      style={styles.dayItem}
      onPress={() => handleDayPress(day)}
      activeOpacity={0.7}
    >
      <View style={styles.dayItemContent}>
        <View style={styles.dayItemHeader}>
          <Text style={styles.dayItemTitle}>
            Day {day.dayNumber}
          </Text>
          <Text style={styles.dayItemDate}>
            {formatDate(day.date)}
          </Text>
        </View>
        
        <Text style={[styles.dayItemStatus, { color: getDayStatusColor(day) }]}>
          {getDayStatusText(day)}
        </Text>
        
        <View style={styles.dayItemFooter}>
          <Text style={styles.dayItemWeek}>
            Week {Math.ceil(day.dayNumber / 7)}
          </Text>
          <Text style={styles.dayItemArrow}>→</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderWeeklyReportButton = () => {
    const completedWeeks = weeks.filter(week => {
      const weekDays = daysWithData.filter(day => day.weekId === week.id);
      return weekDays.length >= 7;
    });

    if (completedWeeks.length === 0) {
      return null;
    }

    return (
      <View style={styles.weeklyReportSection}>
        <Text style={styles.sectionTitle}>Weekly Reports</Text>
        {completedWeeks.map(week => (
          <TouchableOpacity
            key={week.id}
            style={styles.weeklyReportButton}
            onPress={() => handleWeeklyReportPress(week.id)}
            activeOpacity={0.7}
          >
            <View style={styles.weeklyReportContent}>
              <Text style={styles.weeklyReportTitle}>
                Week {week.weekNumber} Report
              </Text>
              <Text style={styles.weeklyReportDate}>
                {new Date(week.startDate).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })} - {week.endDate ? new Date(week.endDate).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                }) : 'Present'}
              </Text>
              <Text style={styles.weeklyReportArrow}>→</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your records...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={initializeData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Past Records</Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={() => {
              console.log('Manual refresh triggered');
              initializeData();
            }}
          >
            <Text style={styles.refreshButtonText}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {daysWithData.length > 0 ? (
          <FlatList
            data={daysWithData}
            renderItem={renderDayItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={renderWeeklyReportButton}
          />
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No days recorded yet</Text>
            <Text style={styles.noDataSubtext}>
              Start tracking your food to see your history here
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: FontSizes.xxlarge,
    fontWeight: '900',
    color: Colors.white,
    textAlign: 'center',
    textTransform: 'capitalize',
    flex: 1,
  },
  refreshButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.medium,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  refreshButtonText: {
    fontSize: 20,
    color: Colors.white,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.large,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  weeklyReportSection: {
    backgroundColor: Colors.white,
    marginBottom: Spacing.md,
  },
  weeklyReportButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weeklyReportContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  weeklyReportTitle: {
    flex: 1,
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: Colors.white,
  },
  weeklyReportDate: {
    fontSize: FontSizes.small,
    color: Colors.white,
    opacity: 0.8,
    marginRight: Spacing.sm,
  },
  weeklyReportArrow: {
    fontSize: FontSizes.medium,
    color: Colors.white,
    fontWeight: 'bold',
  },
  dayItem: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.sm,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayItemContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  dayItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  dayItemTitle: {
    fontSize: FontSizes.large,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  dayItemDate: {
    fontSize: FontSizes.medium,
    color: Colors.textSecondary,
  },
  dayItemStatus: {
    fontSize: FontSizes.small,
    marginBottom: Spacing.sm,
  },
  dayItemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayItemWeek: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
  },
  dayItemArrow: {
    fontSize: FontSizes.medium,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  loadingText: {
    fontSize: FontSizes.large,
    color: Colors.white,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    fontSize: FontSizes.medium,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  retryButton: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
  },
  retryButtonText: {
    fontSize: FontSizes.medium,
    color: Colors.primary,
    fontWeight: '600',
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.white,
    margin: Spacing.md,
    borderRadius: BorderRadius.medium,
  },
  noDataText: {
    fontSize: FontSizes.large,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  noDataSubtext: {
    fontSize: FontSizes.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
  },
});