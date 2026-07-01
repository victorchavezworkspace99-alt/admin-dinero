import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  visible: boolean;
  date: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.88, 360);
const CELL_SIZE = Math.floor((CARD_WIDTH - 32) / 7);

export function DatePickerModal({ visible, date, onSelect, onClose }: Props) {
  const { colors: c } = useTheme();
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
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={{ backgroundColor: c.surface, borderRadius: 20, paddingVertical: 20, paddingHorizontal: 16, width: CARD_WIDTH, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 }}>
              <TouchableOpacity onPress={prev} style={{ padding: 8, borderRadius: 10, backgroundColor: c.background }}>
                <Ionicons name="chevron-back" size={22} color={c.text} />
              </TouchableOpacity>
              <Text style={{ fontSize: 17, fontWeight: '700', color: c.text, letterSpacing: -0.3 }}>{MONTHS[month]} {year}</Text>
              <TouchableOpacity onPress={next} style={{ padding: 8, borderRadius: 10, backgroundColor: c.background }}>
                <Ionicons name="chevron-forward" size={22} color={c.text} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              {DAYS.map(d => (
                <Text key={d} style={{ width: CELL_SIZE, textAlign: 'center', fontSize: 12, fontWeight: '600', color: c.textLight, paddingVertical: 6 }}>{d}</Text>
              ))}
            </View>

            {rows.map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row' }}>
                {row.map((day, di) => {
                  if (day === null) return <View key={`e-${di}`} style={{ width: CELL_SIZE, height: CELL_SIZE, justifyContent: 'center', alignItems: 'center' }} />;
                  const isSelected = day === date.getDate() && month === date.getMonth() && year === date.getFullYear();
                  const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                  const isPast = new Date(year, month, day + 1) <= today;
                  return (
                    <TouchableOpacity
                      key={day}
                      style={{ width: CELL_SIZE, height: CELL_SIZE, justifyContent: 'center', alignItems: 'center', borderRadius: CELL_SIZE / 2, backgroundColor: isSelected ? c.primary : 'transparent' }}
                      onPress={() => handleSelect(day)}
                      disabled={!isPast}
                    >
                      <Text style={[
                        { fontSize: 14, fontWeight: '500', color: c.text },
                        isToday && !isSelected && { color: c.primary, fontWeight: '700' },
                        isSelected && { color: c.surface, fontWeight: '700' },
                        !isPast && { color: c.textLight, opacity: 0.4 },
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            <TouchableOpacity style={{ alignSelf: 'center', marginTop: 12, paddingVertical: 8, paddingHorizontal: 24, borderRadius: 12, backgroundColor: c.primary + '12' }} onPress={() => handleSelect(today.getDate())}>
              <Text style={{ color: c.primary, fontWeight: '700', fontSize: 14 }}>Hoy</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
