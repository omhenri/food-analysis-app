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
import { Day, Week, FoodEntry, AnalysisResult, ComparisonData } from '../models/types';
import { Colors, Spacing, FontSizes, BorderRadius } from '../constants/theme';
import { DatabaseService } from '../services/DatabaseService';
import { ComparisonCard } from '../components/ComparisonCard';
import { WeeklyReportService } from '../services/WeeklyReportService';
import { AnalysisServiceManager } from '../services/AnalysisServiceManager';

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

type TabType = 'previous-week' | 'day1' | 'day2' | 'day3' | 'day4' | 'day5' | 'day6' | 'day7' | 'week-report' | 'next-week';

export const PastRecordsScreen: React.FC = () => {
  const navigation = useNavigation<PastRecordsScreenNavigationProp>();
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [daysWithData, setDaysWithData] = useState<DayWithData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // New state for tab navigation
  const [currentWeekIndex, setCurrentWeekIndex] = useState<number>(0);
  const [selectedTab, setSelectedTab] = useState<TabType>('day1');
  const [currentWeekDays, setCurrentWeekDays] = useState<DayWithData[]>([]);
  const [selectedDayData, setSelectedDayData] = useState<DayWithData | null>(null);
  const [weeklyComparisonData, setWeeklyComparisonData] = useState<ComparisonData[]>([]);
  const [isLoadingDayData, setIsLoadingDayData] = useState<boolean>(false);

  const databaseService = DatabaseService.getInstance();
  const weeklyReportService = WeeklyReportService.getInstance();
  const analysisServiceManager = AnalysisServiceManager.getInstance();

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

  // Update current week data when weeks, currentWeekIndex, or daysWithData change
  useEffect(() => {
    if (weeks.length > 0) {
      updateCurrentWeekData();
    }
  }, [weeks, currentWeekIndex, daysWithData]);

  // Load data when tab changes
  useEffect(() => {
    if (selectedTab !== 'week-report') {
      loadSelectedDayData();
    } else {
      loadWeeklyComparisonData();
    }
  }, [selectedTab, currentWeekDays]);

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

  const updateCurrentWeekData = () => {
    if (weeks.length === 0) return;

    const currentWeek = weeks[Math.min(currentWeekIndex, weeks.length - 1)];
    const weekDays = daysWithData.filter(day => day.weekId === currentWeek.id);

    // Create DayWithData for all 7 days of the week, even if they don't exist
    const allWeekDays: DayWithData[] = [];
    for (let dayNum = 1; dayNum <= 7; dayNum++) {
      const existingDay = weekDays.find(day => day.dayNumber === dayNum);
      if (existingDay) {
        allWeekDays.push(existingDay);
      } else {
        // Create placeholder day
        const dayDate = new Date(currentWeek.startDate);
        dayDate.setDate(dayDate.getDate() + dayNum - 1);

        allWeekDays.push({
          id: -dayNum, // Negative ID for placeholder
          weekId: currentWeek.id,
          dayNumber: dayNum,
          date: dayDate.toISOString().split('T')[0],
          createdAt: currentWeek.createdAt,
          foodCount: 0,
          hasAnalysis: false,
        });
      }
    }

    setCurrentWeekDays(allWeekDays);
  };

  const handleTabPress = (tab: TabType) => {
    if (tab === 'previous-week' && currentWeekIndex > 0) {
      setCurrentWeekIndex(currentWeekIndex - 1);
      setSelectedTab('day1');
    } else if (tab === 'next-week' && currentWeekIndex < weeks.length - 1) {
      setCurrentWeekIndex(currentWeekIndex + 1);
      setSelectedTab('day1');
    } else if (tab.startsWith('day')) {
      setSelectedTab(tab);
    } else if (tab === 'week-report') {
      setSelectedTab(tab);
    }
  };

  const loadSelectedDayData = async () => {
    if (selectedTab === 'week-report' || !selectedTab.startsWith('day')) return;

    const dayNumber = parseInt(selectedTab.replace('day', ''));
    const dayData = currentWeekDays.find(day => day.dayNumber === dayNumber);

    console.log('Loading day data for day', dayNumber, 'found:', !!dayData, 'dayData:', dayData);

    // Always set the day data, even if it's a placeholder
    setSelectedDayData(dayData || null);
  };

  const loadWeeklyComparisonData = async () => {
    if (weeks.length === 0) return;

    const currentWeek = weeks[Math.min(currentWeekIndex, weeks.length - 1)];
    setIsLoadingDayData(true);
    try {
      // Check if weekly comparison data exists in database
      const storedComparison = await databaseService.getWeeklyComparisonForWeek(currentWeek.id);
      if (storedComparison) {
        setWeeklyComparisonData(storedComparison);
        return;
      }

      // If not in database, generate from nutrient aggregation
      await generateWeeklyComparisonData(currentWeek.id);
    } catch (err) {
      console.error('Failed to load weekly comparison:', err);
      setWeeklyComparisonData([]);
    } finally {
      setIsLoadingDayData(false);
    }
  };

  const generateWeeklyComparisonData = async (weekId: number) => {
    try {
      setIsLoadingDayData(true);

      // Get all nutrients consumed in this week
      const weeklyNutrients = await getWeeklyNutrientsConsumed(weekId);

      // Filter out nutrients with 0 or invalid amounts
      const validNutrients = weeklyNutrients.filter(nutrient =>
        nutrient.total_amount > 0 && nutrient.name && nutrient.name.trim()
      );

      if (validNutrients.length === 0) {
        setWeeklyComparisonData([]);
        return;
      }

      // Get weekly recommended intake from AI
      const recommendedIntake = await analysisServiceManager.getWeeklyRecommendedIntake(validNutrients);

      // Generate comparison data
      const comparisonData = generateComparisonFromRecommendedIntake(validNutrients, recommendedIntake);

      // Save to database
      await databaseService.saveWeeklyComparisonResult(weekId, comparisonData);

      setWeeklyComparisonData(comparisonData);
    } catch (error) {
      console.error('Failed to generate weekly comparison data:', error);
      setWeeklyComparisonData([]);
    } finally {
      setIsLoadingDayData(false);
    }
  };

  const getWeeklyNutrientsConsumed = async (weekId: number): Promise<Array<{name: string, total_amount: number, unit: string}>> => {
    // Get all days in this week
    const days = await databaseService.getDaysForWeek(weekId);

    const nutrientTotals: {[key: string]: {total_amount: number, unit: string}} = {};

    for (const day of days) {
      // Get analysis results for this day
      const analysisResults = await databaseService.getAnalysisForDay(day.id);

      for (const result of analysisResults) {
        for (const substance of result.chemicalSubstances) {
          const key = substance.name.toLowerCase();
          if (!nutrientTotals[key]) {
            nutrientTotals[key] = { total_amount: 0, unit: 'grams' };
          }
          nutrientTotals[key].total_amount += substance.amount;
        }
      }
    }

    return Object.entries(nutrientTotals).map(([name, data]) => ({
      name,
      total_amount: data.total_amount,
      unit: data.unit
    }));
  };

  const generateComparisonFromRecommendedIntake = (
    nutrientsConsumed: Array<{name: string, total_amount: number, unit: string}>,
    recommendedIntake: any
  ): ComparisonData[] => {
    const comparisons: ComparisonData[] = [];

    for (const nutrient of nutrientsConsumed) {
      const recommended = recommendedIntake.recommended_intakes[nutrient.name];
      if (recommended !== undefined) {
        const consumed = nutrient.total_amount;
        const percentage = (consumed / recommended) * 100;

        let status: 'optimal' | 'under' | 'over';
        if (percentage >= 90 && percentage <= 110) {
          status = 'optimal';
        } else if (percentage < 90) {
          status = 'under';
        } else {
          status = 'over';
        }

        comparisons.push({
          substance: nutrient.name,
          consumed: consumed,
          recommended: recommended,
          percentage: percentage,
          status: status,
          unit: nutrient.unit
        });
      }
    }

    return comparisons;
  };

  const getCurrentWeek = (): Week | null => {
    if (weeks.length === 0) return null;
    return weeks[Math.min(currentWeekIndex, weeks.length - 1)];
  };

  const isLatestWeek = (): boolean => {
    return currentWeekIndex === 0; // Assuming weeks are sorted with most recent first
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

  const renderTabBar = () => {
    const currentWeek = getCurrentWeek();
    if (!currentWeek) return null;

    const tabs: { key: TabType; label: string; enabled: boolean }[] = [
      { key: 'previous-week', label: 'Previous Week', enabled: currentWeekIndex > 0 },
      { key: 'day1', label: 'Day 1', enabled: true },
      { key: 'day2', label: 'Day 2', enabled: true },
      { key: 'day3', label: 'Day 3', enabled: true },
      { key: 'day4', label: 'Day 4', enabled: true },
      { key: 'day5', label: 'Day 5', enabled: true },
      { key: 'day6', label: 'Day 6', enabled: true },
      { key: 'day7', label: 'Day 7', enabled: true },
      { key: 'week-report', label: 'Week Report', enabled: true },
      { key: 'next-week', label: 'Next Week', enabled: currentWeekIndex < weeks.length - 1 },
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              selectedTab === tab.key && styles.tabActive,
              !tab.enabled && styles.tabDisabled,
            ]}
            onPress={() => tab.enabled && handleTabPress(tab.key)}
            disabled={!tab.enabled}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === tab.key && styles.tabTextActive,
                !tab.enabled && styles.tabTextDisabled,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderDayDetail = () => {
    if (!selectedDayData) {
      return (
        <View style={styles.dayDetailContainer}>
          <Text style={styles.noDataText}>No data for this day</Text>
        </View>
      );
    }

    return (
      <View style={styles.dayDetailContainer}>
        <View style={styles.dayHeader}>
          <Text style={styles.dayTitle}>Day {selectedDayData.dayNumber}</Text>
          <Text style={styles.dayDate}>{formatDate(selectedDayData.date)}</Text>
        </View>

        <View style={styles.dayStats}>
          <Text style={styles.dayStatus}>
            {getDayStatusText(selectedDayData)}
          </Text>
          <Text style={styles.dayFoodCount}>
            {selectedDayData.foodCount} food{selectedDayData.foodCount !== 1 ? 's' : ''} logged
          </Text>
        </View>

        {selectedDayData.id > 0 && (
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => handleDayPress(selectedDayData!)}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderWeeklyReport = () => {
    const currentWeek = getCurrentWeek();
    if (!currentWeek) return null;

    return (
      <View style={styles.weeklyReportContainer}>
        <View style={styles.weeklyReportHeader}>
          <Text style={styles.weeklyReportTitle}>Week {currentWeek.weekNumber} Report</Text>
          <Text style={styles.weeklyReportDate}>
            {new Date(currentWeek.startDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })} - {currentWeek.endDate ?
              new Date(currentWeek.endDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              }) : 'Present'}
          </Text>
        </View>

        <Text style={styles.comparisonTitle}>Nutritional Analysis Summary</Text>

        {weeklyComparisonData.length > 0 ? (
          <ScrollView
            style={styles.comparisonScrollView}
            contentContainerStyle={styles.comparisonContent}
            showsVerticalScrollIndicator={false}
          >
            {weeklyComparisonData.map((comparison, index) => (
              <ComparisonCard
                key={`${comparison.substance}-${index}`}
                comparisonData={comparison}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.noComparisonData}>
            <Text style={styles.noComparisonText}>No comparison data available</Text>
          </View>
        )}
      </View>
    );
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

        {/* Tab Bar */}
        {weeks.length > 0 && renderTabBar()}

        {/* Main Data Section */}
        <View style={styles.mainDataSection}>
          {isLoadingDayData ? (
            <View style={styles.loadingDayData}>
              <ActivityIndicator size="large" color="#6FF3E0" />
              <Text style={styles.loadingDayDataText}>Loading data...</Text>
            </View>
          ) : selectedTab === 'week-report' ? (
            renderWeeklyReport()
          ) : (
            renderDayDetail()
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
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
  tabBar: {
    backgroundColor: Colors.white,
    maxHeight: 70,
  },
  tabBarContent: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  tab: {
    backgroundColor: 'transparent',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: 2,
    borderRadius: BorderRadius.medium,
    minWidth: 80,
    alignItems: 'center',
  },
  tabActive: {
  },
  tabDisabled: {
    opacity: 0.5,
  },
  tabText: {
    fontSize: FontSizes.medium,
    color: Colors.background, // Teal for inactive
    fontWeight: '500',
  },
  tabTextActive: {
    color: Colors.black, // Black for active
    fontWeight: 'bold',
  },
  tabTextDisabled: {
    color: Colors.textSecondary,
  },
  mainDataSection: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.medium,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingDayData: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingDayDataText: {
    fontSize: FontSizes.medium,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  dayDetailContainer: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dayTitle: {
    fontSize: FontSizes.xlarge,
    fontWeight: 'bold',
    color: Colors.black,
    marginBottom: Spacing.xs,
  },
  dayDate: {
    fontSize: FontSizes.medium,
    color: Colors.textSecondary,
  },
  dayStats: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dayStatus: {
    fontSize: FontSizes.medium,
    color: Colors.black,
    marginBottom: Spacing.sm,
  },
  dayFoodCount: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
  },
  viewDetailsButton: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
    marginTop: Spacing.md,
  },
  viewDetailsText: {
    fontSize: FontSizes.medium,
    color: Colors.white,
    fontWeight: '600',
  },
  weeklyReportContainer: {
    flex: 1,
    padding: Spacing.lg,
  },
  weeklyReportHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  comparisonTitle: {
    fontSize: FontSizes.large,
    fontWeight: '600',
    color: Colors.black,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  comparisonScrollView: {
    flex: 1,
  },
  comparisonContent: {
    paddingBottom: Spacing.lg,
  },
  noComparisonData: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noComparisonText: {
    fontSize: FontSizes.medium,
    color: Colors.textSecondary,
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