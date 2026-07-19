import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

interface CalendarPickerProps {
  onSelectDate: (date: string) => void;
  onClose: () => void;
  initialDate?: string; // Expects YYYY-MM-DD
}

export default function CalendarPicker({ onSelectDate, onClose, initialDate }: CalendarPickerProps) {
  const today = new Date();
  
  let parsedYear = today.getFullYear();
  let parsedMonth = today.getMonth(); // 0-indexed
  let parsedDay = today.getDate();

  // If a valid initial date is provided, initialize the calendar viewport on it
  if (initialDate) {
    const parts = initialDate.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        parsedYear = y;
        parsedMonth = m;
        parsedDay = d;
      }
    }
  }

  // State to track currently viewed month and year
  const [currentYear, setCurrentYear] = useState(parsedYear);
  const [currentMonth, setCurrentMonth] = useState(parsedMonth);

  // State to toggle month/year dropdown lists
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Generate range of years for dropdown preview (e.g., last year to 10 years ahead)
  const years: number[] = [];
  const startYear = today.getFullYear() - 5;
  for (let y = startYear; y <= today.getFullYear() + 15; y++) {
    years.push(y);
  }

  // Calculate helper values for rendering month grid
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOffset = getFirstDayOfMonth(currentYear, currentMonth);

  // Build grid cell array
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOffset; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(day);
  }

  const handleSelectDay = (day: number) => {
    const formattedMonth = String(currentMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    onSelectDate(`${currentYear}-${formattedMonth}-${formattedDay}`);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  return (
    <View style={styles.container}>
      {/* Month / Year header navigator */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
          <Text style={styles.navText}>◀</Text>
        </TouchableOpacity>

        <View style={styles.selectors}>
          <TouchableOpacity 
            style={styles.selectorBtn} 
            onPress={() => {
              setShowMonthDropdown(!showMonthDropdown);
              setShowYearDropdown(false);
            }}
          >
            <Text style={styles.selectorText}>{monthNames[currentMonth]} ▾</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.selectorBtn}
            onPress={() => {
              setShowYearDropdown(!showYearDropdown);
              setShowMonthDropdown(false);
            }}
          >
            <Text style={styles.selectorText}>{currentYear} ▾</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
          <Text style={styles.navText}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Month preview list selection list */}
      {showMonthDropdown && (
        <View style={styles.dropdownWrapper}>
          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
            {monthNames.map((name, idx) => (
              <TouchableOpacity 
                key={name} 
                style={[styles.dropdownItem, currentMonth === idx && styles.dropdownItemActive]}
                onPress={() => {
                  setCurrentMonth(idx);
                  setShowMonthDropdown(false);
                }}
              >
                <Text style={[styles.dropdownItemText, currentMonth === idx && styles.dropdownItemTextActive]}>
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Year preview selection list */}
      {showYearDropdown && (
        <View style={styles.dropdownWrapper}>
          <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
            {years.map((year) => (
              <TouchableOpacity 
                key={year} 
                style={[styles.dropdownItem, currentYear === year && styles.dropdownItemActive]}
                onPress={() => {
                  setCurrentYear(year);
                  setShowYearDropdown(false);
                }}
              >
                <Text style={[styles.dropdownItemText, currentYear === year && styles.dropdownItemTextActive]}>
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {!showMonthDropdown && !showYearDropdown && (
        <>
          {/* Week column headers */}
          <View style={styles.weekHeaders}>
            {daysOfWeek.map((day) => (
              <Text key={day} style={styles.weekHeaderDay}>
                {day}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {cells.map((day, idx) => {
              const isSelected = day === parsedDay && currentMonth === parsedMonth && currentYear === parsedYear;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.gridDayCell,
                    day === null && styles.emptyCell,
                    isSelected && styles.selectedCell,
                  ]}
                  disabled={day === null}
                  onPress={() => day !== null && handleSelectDay(day)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.selectedDayText,
                      day === null && styles.emptyDayText,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
        <Text style={styles.closeBtnText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 6,
  },
  navText: {
    color: '#228be6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  selectors: {
    flexDirection: 'row',
  },
  selectorBtn: {
    backgroundColor: '#f1f3f5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  selectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
  },
  dropdownWrapper: {
    height: 180,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  dropdownScroll: {
    flex: 1,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  dropdownItemActive: {
    backgroundColor: '#e7f5ff',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#495057',
  },
  dropdownItemTextActive: {
    color: '#228be6',
    fontWeight: '700',
  },
  weekHeaders: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekHeaderDay: {
    fontSize: 11,
    fontWeight: '700',
    color: '#adb5bd',
    width: 32,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridDayCell: {
    width: '14.28%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    marginVertical: 1,
  },
  emptyCell: {
    backgroundColor: 'transparent',
  },
  selectedCell: {
    backgroundColor: '#228be6',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212529',
  },
  selectedDayText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  emptyDayText: {
    color: 'transparent',
  },
  closeBtn: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f3f5',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fa5252',
    fontWeight: '600',
    fontSize: 13,
  },
});
