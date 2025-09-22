import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Day, Week } from '../models/types';
import { Colors, Spacing, BorderRadius, FontSizes } from '../constants/theme';

interface DaySelectorProps {
  currentWeek: Week | null;
  days: Day[];
  selectedDayId: number | null;
  onDaySelect: (day: Day) => void;
  onWeeklyReportPress?: () => void;
  showWeeklyReport?: boolean;
}

export const DaySelector: React.FC<DaySelectorProps> = ({
  currentWeek,
  days,
  selectedDayId,
  onDaySelect,
  onWeeklyReportPress,
  showWeeklyReport = false,
}) => {
  const getDayLabel = (dayNumber: number): string => {
    return `Day${dayNumber}`;
  };

  const getDayDate = (day: Day): string => {
    const date = new Date(day.date);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isCurrentDay = (day: Day): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return day.date === today;
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Week Button */}
        {showWeeklyReport && onWeeklyReportPress && (
          <TouchableOpacity
            style={styles.weekButton}
            onPress={onWeeklyReportPress}
          >
            <Text style={styles.weekButtonText}>Week</Text>
          </TouchableOpacity>
        )}

        {/* Day Buttons */}
        {days.map((day) => (
          <TouchableOpacity
            key={day.id}
            style={[
              styles.dayButton,
              selectedDayId === day.id && styles.dayButtonSelected,
              isCurrentDay(day) && styles.dayButtonCurrent,
            ]}
            onPress={() => onDaySelect(day)}
          >
            <Text
              style={[
                styles.dayButtonText,
                selectedDayId === day.id && styles.dayButtonTextSelected,
                isCurrentDay(day) && styles.dayButtonTextCurrent,
              ]}
            >
              {getDayLabel(day.dayNumber)}
            </Text>
            <Text
              style={[
                styles.dayDateText,
                selectedDayId === day.id && styles.dayDateTextSelected,
                isCurrentDay(day) && styles.dayDateTextCurrent,
              ]}
            >
              {getDayDate(day)}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Week Button (End) */}
        {showWeeklyReport && onWeeklyReportPress && days.length >= 7 && (
          <TouchableOpacity
            style={styles.weekButton}
            onPress={onWeeklyReportPress}
          >
            <Text style={styles.weekButtonText}>Week</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Week Info */}
      {currentWeek && (
        <View style={styles.weekInfo}>
          <Text style={styles.weekInfoText}>
            Week {currentWeek.weekNumber} • {days.length} day{days.length !== 1 ? 's' : ''} recorded
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    paddingVertical: Spacing.sm,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },
  dayButton: {
    backgroundColor: Colors.buttonSecondary,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    marginRight: Spacing.xs,
    minWidth: 80,
    alignItems: 'center',
  },
  dayButtonSelected: {
    backgroundColor: Colors.primary,
  },
  dayButtonCurrent: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  dayButtonText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: Colors.textPrimary,
    textTransform: 'capitalize',
  },
  dayButtonTextSelected: {
    color: Colors.white,
  },
  dayButtonTextCurrent: {
    color: Colors.primary,
  },
  dayDateText: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  dayDateTextSelected: {
    color: Colors.white,
  },
  dayDateTextCurrent: {
    color: Colors.primary,
  },
  weekButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginRight: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekButtonText: {
    fontSize: FontSizes.medium,
    fontWeight: '600',
    color: Colors.white,
    textTransform: 'capitalize',
  },
  weekInfo: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
  },
  weekInfoText: {
    fontSize: FontSizes.small,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});