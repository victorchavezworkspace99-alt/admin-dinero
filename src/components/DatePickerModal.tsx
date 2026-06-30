import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

interface Props {
  visible: boolean;
  date: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export function DatePickerModal({ visible, date, onSelect, onClose }: Props) {
  const [viewDate, setViewDate] = useState(date);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const prev = () => setViewDate(new Date(year, month - 1, 1));
  const next = () => setViewDate(new Date(year, month + 1, 1));

  const handleSelect = (day: number) => {
    const selected = new Date(year, month, day);
    if (selected <= today) {
      onSelect(selected);
      onClose();
    }
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.card} activeOpacity={1} onPress={() => {}}>
          <View style={styles.header}>
            <TouchableOpacity onPress={prev} style={styles.arrow}>
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.monthYear}>{MONTHS[month]} {year}</Text>
            <TouchableOpacity onPress={next} style={styles.arrow}>
              <Ionicons name="chevron-forward" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {DAYS.map(d => <Text key={d} style={styles.weekDay}>{d}</Text>)}
          </View>

          {rows.map((row, ri) => (
            <View key={ri} style={styles.weekRow}>
              {row.map((day, di) => {
                if (day === null) return <View key={`e-${di}`} style={styles.dayCell} />;
                const isSelected = day === date.getDate() && month === date.getMonth() && year === date.getFullYear();
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                const isPast = new Date(year, month, day + 1) <= today;
                return (
                  <TouchableOpacity
                    key={day}
                    style={[styles.dayCell, isSelected && styles.selectedDay]}
                    onPress={() => handleSelect(day)}
                    disabled={!isPast}
                  >
                    <Text style={[
                      styles.dayText,
                      isToday && !isSelected && styles.todayText,
                      isSelected && styles.selectedDayText,
                      !isPast && styles.disabledDay,
                    ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          <TouchableOpacity style={styles.todayBtn} onPress={() => handleSelect(today.getDate())}>
            <Text style={styles.todayBtnText}>Hoy</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  arrow: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: Colors.background,
  },
  monthYear: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.3,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  weekDay: {
    width: 40,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
    paddingVertical: 6,
  },
  dayCell: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  selectedDay: {
    backgroundColor: Colors.primary,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  todayText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  selectedDayText: {
    color: Colors.surface,
    fontWeight: '700',
  },
  disabledDay: {
    color: Colors.textLight,
    opacity: 0.4,
  },
  todayBtn: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary + '12',
  },
  todayBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
});
