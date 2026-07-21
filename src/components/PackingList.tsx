import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  PanResponder,
  Animated,
} from 'react-native';
import {
  getPackingItemsForTrip,
  createPackingItem,
  updatePackingItemPacked,
  deletePackingItem,
} from '../services/dbService';
import { PackingItem } from '../types';
import { useTranslation } from '../services/translationService';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface PackingListProps {
  tripId: string;
}

interface SwipeRowProps {
  item: PackingItem;
  onToggle: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  isRTL: boolean;
  t: any;
}

// Custom swipe-right wrapper row using core PanResponder & Animated
function SwipeablePackingRow({ item, onToggle, onDelete, onDuplicate, isRTL, t }: SwipeRowProps) {
  const pan = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Active when swiping horizontally right
        return Math.abs(gestureState.dx) > 10 && gestureState.dx > 0;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) {
          pan.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 120) {
          // Animate complete swipe out and trigger toggle packed
          Animated.timing(pan, {
            toValue: 400,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            onToggle();
            pan.setValue(0);
          });
        } else {
          // Spring back to center
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: true,
            friction: 5,
          }).start();
        }
      },
    })
  ).current;

  let emoji = '📍';
  const type = item.category.toLowerCase();
  if (type.includes('clothing')) emoji = '👕';
  else if (type.includes('toiletries')) emoji = '🧴';
  else if (type.includes('electronics')) emoji = '🔌';

  const rowStyle = { flexDirection: (isRTL ? 'row-reverse' : 'row') as 'row' | 'row-reverse' };
  const textAlignStyle = { textAlign: (isRTL ? 'right' : 'left') as 'left' | 'right' };

  return (
    <View style={styles.swipeContainer}>
      {/* Background Action Underlay (Shows green packed sign) */}
      <View style={[styles.underlay, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={styles.underlayText}>
          {item.isPacked ? '⬜ Unpack' : '✅ Packed!'}
        </Text>
      </View>

      {/* Foreground Interactive Card */}
      <Animated.View
        style={[
          styles.itemCard,
          { transform: [{ translateX: pan }] },
          item.isPacked && styles.itemCardPacked,
        ]}
        {...panResponder.panHandlers}
      >
        <View style={[styles.itemContent, rowStyle]}>
          <TouchableOpacity
            style={styles.checkboxTouch}
            onPress={onToggle}
            activeOpacity={0.7}
          >
            <Text style={styles.checkboxEmoji}>{item.isPacked ? '✅' : '⬜'}</Text>
          </TouchableOpacity>

          <Text style={[styles.emojiMargin]}>{emoji}</Text>

          <Text
            style={[
              styles.itemName,
              textAlignStyle,
              item.isPacked && styles.itemNamePacked,
            ]}
            numberOfLines={2}
          >
            {item.itemName}
          </Text>

          <View style={[rowStyle, { alignItems: 'center', gap: 10 }]}>
            <TouchableOpacity 
              onPress={onDuplicate}
              activeOpacity={0.7}
              style={styles.iconBtn}
            >
              <Text style={{ fontSize: 13 }}>👯</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={onDelete}
              activeOpacity={0.7}
              style={[styles.iconBtn, { backgroundColor: '#fff5f5' }]}
            >
              <Text style={{ fontSize: 13 }}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

export default function PackingList({ tripId }: PackingListProps) {
  const { t, isRTL } = useTranslation();
  const [items, setItems] = useState<PackingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItemName, setNewItemName] = useState('');
  const [newCategory, setNewCategory] = useState('Clothing');

  const categories = [
    { value: 'Clothing', label: isRTL ? 'ביגוד' : 'Clothing' },
    { value: 'Toiletries', label: isRTL ? 'כלי רחצה' : 'Toiletries' },
    { value: 'Electronics', label: isRTL ? 'מסמכים ואלקטרוניקה' : 'Documents & Electronics' },
    { value: 'Other', label: isRTL ? 'ציוד ואחר' : 'Other' }
  ];

  useEffect(() => {
    fetchPackingItems();
  }, [tripId]);

  const fetchPackingItems = async () => {
    try {
      setLoading(true);
      const data = await getPackingItemsForTrip(tripId);
      setItems(data);
    } catch (error) {
      console.error('Failed to fetch packing items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemName.trim()) return;
    try {
      const newItem = await createPackingItem(tripId, newItemName.trim(), newCategory);
      setItems((prev) => [...prev, newItem]);
      setNewItemName('');
    } catch (error) {
      console.error('Failed to add packing item:', error);
    }
  };

  const handleToggleItem = async (itemId: string, currentStatus: boolean) => {
    try {
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, isPacked: !currentStatus } : item))
      );
      await updatePackingItemPacked(itemId, !currentStatus);
    } catch (error) {
      console.error('Failed to toggle packing item:', error);
      fetchPackingItems();
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      await deletePackingItem(itemId);
    } catch (error) {
      console.error('Failed to delete packing item:', error);
      fetchPackingItems();
    }
  };

  const handleDuplicateItem = async (item: PackingItem) => {
    try {
      const duplicatedItem = await createPackingItem(
        tripId,
        `${item.itemName} (${isRTL ? 'עותק' : 'Copy'})`,
        item.category
      );
      setItems((prev) => [...prev, duplicatedItem]);
    } catch (error) {
      console.error('Failed to duplicate packing item:', error);
    }
  };

  // Sort items: Unpacked first, Packed last
  const sortedItems = [...items].sort((a, b) => {
    if (a.isPacked === b.isPacked) {
      return a.itemName.localeCompare(b.itemName);
    }
    return a.isPacked ? 1 : -1;
  });

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const rowStyle = { flexDirection: (isRTL ? 'row-reverse' : 'row') as 'row' | 'row-reverse' };
  const textAlignStyle = { textAlign: (isRTL ? 'right' : 'left') as 'left' | 'right' };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, textAlignStyle]}>
        🎒 {isRTL ? 'רשימת ציוד וביגוד' : 'Trip Packing List'}
      </Text>

      {/* Input panel */}
      <View style={[styles.inputContainer, rowStyle]}>
        <TextInput
          style={[styles.input, textAlignStyle, { flex: 2 }]}
          placeholder={isRTL ? 'הוסף פריט ציוד...' : 'Add gear item...'}
          value={newItemName}
          onChangeText={setNewItemName}
          onSubmitEditing={handleAddItem}
        />
        
        <View style={styles.selectorWrapper}>
          <select
            style={mobileSelectStyle}
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </View>

        <TouchableOpacity 
          style={styles.addBtn}
          onPress={handleAddItem}
          activeOpacity={0.8}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {sortedItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {isRTL ? 'אין עדיין פריטים ברשימה.' : 'Checklist is empty.'}
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1, marginTop: 10 }}>
          {sortedItems.map((item) => (
            <SwipeablePackingRow
              key={item.id}
              item={item}
              onToggle={() => handleToggleItem(item.id, item.isPacked)}
              onDelete={() => handleDeleteItem(item.id)}
              onDuplicate={() => handleDuplicateItem(item)}
              isRTL={isRTL}
              t={t}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 20,
    width: '100%',
  },
  loaderContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 16,
  },
  inputContainer: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    width: '100%',
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: typography.sizes.sm,
    backgroundColor: '#f8f9fa',
  },
  selectorWrapper: {
    flex: 1.2,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    color: colors.white,
    fontSize: 22,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: typography.sizes.sm,
    color: colors.textLight,
  },
  swipeContainer: {
    position: 'relative',
    marginBottom: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  underlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#2b8a3e',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  underlayText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
  },
  itemCardPacked: {
    backgroundColor: '#f8f9fa',
    opacity: 0.6,
  },
  itemContent: {
    alignItems: 'center',
    width: '100%',
  },
  checkboxTouch: {
    padding: 4,
  },
  checkboxEmoji: {
    fontSize: 16,
  },
  emojiMargin: {
    fontSize: 16,
    marginHorizontal: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  itemNamePacked: {
    textDecorationLine: 'line-through',
    color: colors.textLight,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#f1f3f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const mobileSelectStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  border: 'none',
  background: 'transparent',
  paddingLeft: '8px',
  paddingRight: '8px',
  fontSize: '13px',
  color: '#495057',
};
