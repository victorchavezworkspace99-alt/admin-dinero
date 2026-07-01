import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, Dimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  visible: boolean;
  startDate: Date | null;
  endDate: Date | null;
  onApply: (start: Date, end: Date) => void;
  onClear: () => void;
  onClose: () => void;
}

const DAYS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.9, 380);
const CELL_SIZE = Math.floor((CARD_WIDTH - 32) / 7);

function pad(n: number) { return n < 10 ? '0' + n : '' + n; }

function formatDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function DateRangeFilter({ visible, startDate, endDate, onApply, onClear, onClose }: Props) {
  const { colors: c } = useTheme();
  const [pickMode, setPickMode] = useState<'start' | 'end'>('start');
  const [viewDate, setViewDate] = useState(new Date());
  const [tempStart, setTempStart] = useState<Date | null>(startDate);
  const [tempEnd, setTempEnd] = useState<Date | null>(endDate);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells = useMemo(() => {
    const c: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) c.push(null);
    for (let d = 1; d <= daysInMonth; d++) c.push(d);
    return c;
  }, [firstDay, daysInMonth]);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const handleSelect = (day: number) => {
    const selected = new Date(year, month, day);
    if (selected > today) return;
    if (pickMode === 'start') {
      setTempStart(selected);
      if (tempEnd && selected > tempEnd) setTempEnd(null);
      setPickMode('end');
    } else {
      if (tempStart && selected < tempStart) {
        setTempStart(selected);
        setTempEnd(tempStart);
      } else {
        setTempEnd(selected);
      }
      setPickMode('start');
    }
  };

  const quickFilters = [
    {
      label: 'Hoy',
      onPress: () => {
        setTempStart(today);
        setTempEnd(today);
      },
    },
    {
      label: 'Esta Semana',
      onPress: () => {
        const d = new Date(today);
        const dayOfWeek = d.getDay();
        const start = new Date(d);
        start.setDate(d.getDate() - dayOfWeek);
        setTempStart(start);
        setTempEnd(today);
      },
    },
    {
      label: 'Este Mes',
      onPress: () => {
        setTempStart(new Date(today.getFullYear(), today.getMonth(), 1));
        setTempEnd(today);
      },
    },
    {
      label: '3 Meses',
      onPress: () => {
        const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        setTempStart(start);
        setTempEnd(today);
      },
    },
    {
      label: 'Este Año',
      onPress: () => {
        setTempStart(new Date(today.getFullYear(), 0, 1));
        setTempEnd(today);
      },
    },
  ];

  const handleApply = () => {
    if (tempStart && tempEnd) {
      onApply(tempStart, tempEnd);
    }
    onClose();
  };

  const handleClear = () => {
    setTempStart(null);
    setTempEnd(null);
    onClear();
    onClose();
  };

  const daysBetween = tempStart && tempEnd ? Math.round((tempEnd.getTime() - tempStart.getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 34 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: c.text, letterSpacing: -0.4 }}>Filtrar por fecha</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color={c.textLight} />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 16, marginBottom: 12 }}>
            {quickFilters.map((qf) => (
              <TouchableOpacity
                key={qf.label}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: c.primary + '14', marginRight: 8 }}
                onPress={qf.onPress}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: c.primary }}>{qf.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 12, gap: 10 }}>
            <TouchableOpacity
              style={[{
                flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14,
                backgroundColor: pickMode === 'start' ? c.primary + '18' : c.background,
                borderWidth: 1.5, borderColor: pickMode === 'start' ? c.primary : c.border,
              }]}
              onPress={() => setPickMode('start')}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: c.textSecondary, marginBottom: 2 }}>Desde</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: tempStart ? c.text : c.textLight }}>
                {tempStart ? `${tempStart.getDate()} ${MONTHS[tempStart.getMonth()]} ${tempStart.getFullYear()}` : 'Seleccionar'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[{
                flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14,
                backgroundColor: pickMode === 'end' ? c.primary + '18' : c.background,
                borderWidth: 1.5, borderColor: pickMode === 'end' ? c.primary : c.border,
              }]}
              onPress={() => setPickMode('end')}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: c.textSecondary, marginBottom: 2 }}>Hasta</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: tempEnd ? c.text : c.textLight }}>
                {tempEnd ? `${tempEnd.getDate()} ${MONTHS[tempEnd.getMonth()]} ${tempEnd.getFullYear()}` : 'Seleccionar'}
              </Text>
            </TouchableOpacity>
          </View>

          {tempStart && tempEnd && (
            <Text style={{ fontSize: 13, color: c.textSecondary, textAlign: 'center', marginBottom: 8, fontWeight: '500' }}>
              {daysBetween} {daysBetween === 1 ? 'dia' : 'dias'} seleccionados
            </Text>
          )}

          <View style={{ paddingHorizontal: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 }}>
              <TouchableOpacity onPress={() => setViewDate(new Date(year, month - 1, 1))} style={{ padding: 6, borderRadius: 8, backgroundColor: c.background }}>
                <Ionicons name="chevron-back" size={20} color={c.text} />
              </TouchableOpacity>
              <Text style={{ fontSize: 15, fontWeight: '700', color: c.text, letterSpacing: -0.3 }}>{MONTHS[month]} {year}</Text>
              <TouchableOpacity onPress={() => setViewDate(new Date(year, month + 1, 1))} style={{ padding: 6, borderRadius: 8, backgroundColor: c.background }}>
                <Ionicons name="chevron-forward" size={20} color={c.text} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', marginBottom: 2 }}>
              {DAYS.map(d => (
                <Text key={d} style={{ width: CELL_SIZE, textAlign: 'center', fontSize: 11, fontWeight: '600', color: c.textLight, paddingVertical: 4 }}>{d}</Text>
              ))}
            </View>

            {rows.map((row, ri) => (
              <View key={ri} style={{ flexDirection: 'row' }}>
                {row.map((day, di) => {
                  if (day === null) return <View key={`e-${di}`} style={{ width: CELL_SIZE, height: CELL_SIZE, justifyContent: 'center', alignItems: 'center' }} />;
                  const d = new Date(year, month, day);
                  const isStart = tempStart ? sameDay(d, tempStart) : false;
                  const isEnd = tempEnd ? sameDay(d, tempEnd) : false;
                  const isInRange = tempStart && tempEnd && d >= tempStart && d <= tempEnd;
                  const isToday = sameDay(d, today);
                  const isPast = d <= today;
                  return (
                    <TouchableOpacity
                      key={day}
                      style={{
                        width: CELL_SIZE, height: CELL_SIZE, justifyContent: 'center', alignItems: 'center',
                        backgroundColor: isStart || isEnd ? c.primary : isInRange ? c.primary + '18' : 'transparent',
                        borderTopLeftRadius: isStart ? CELL_SIZE / 2 : 0,
                        borderBottomLeftRadius: isStart ? CELL_SIZE / 2 : 0,
                        borderTopRightRadius: isEnd ? CELL_SIZE / 2 : 0,
                        borderBottomRightRadius: isEnd ? CELL_SIZE / 2 : 0,
                        borderRadius: isStart && isEnd && sameDay(tempStart!, tempEnd!) ? CELL_SIZE / 2 : undefined,
                      }}
                      onPress={() => handleSelect(day)}
                      disabled={!isPast}
                    >
                      <Text style={[
                        { fontSize: 14, fontWeight: '500', color: c.text },
                        isToday && !isStart && !isEnd && { color: c.primary, fontWeight: '700' },
                        (isStart || isEnd) && { color: c.surface, fontWeight: '700' },
                        !isPast && { color: c.textLight, opacity: 0.4 },
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginTop: 16, gap: 10 }}>
            <TouchableOpacity
              style={{ flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: c.background, borderWidth: 1, borderColor: c.border }}
              onPress={handleClear}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: c.textSecondary }}>Limpiar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: c.primary, opacity: tempStart && tempEnd ? 1 : 0.5 }}
              onPress={handleApply}
              disabled={!tempStart || !tempEnd}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
