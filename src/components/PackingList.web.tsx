import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { getPackingItemsForTrip, createPackingItem, updatePackingItemPacked, deletePackingItem } from '../services/dbService';
import { PackingItem } from '../types';
import { useTranslation } from '../services/translationService';

interface PackingListProps {
  tripId: string;
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
      // Optimistic UI update
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, isPacked: !currentStatus } : item))
      );
      await updatePackingItemPacked(itemId, !currentStatus);
    } catch (error) {
      console.error('Failed to toggle packing item:', error);
      // Rollback on failure
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

  const handlePrint = () => {
    window.print();
  };

  // Group items by category for structured layout
  const groupedItems = categories.reduce((acc, cat) => {
    acc[cat.value] = items.filter((item) => item.category === cat.value);
    return acc;
  }, {} as Record<string, PackingItem[]>);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="small" color="#228be6" />
      </View>
    );
  }

  const rowStyle = { flexDirection: (isRTL ? 'row-reverse' : 'row') as 'row' | 'row-reverse' };
  const textAlignStyle = { textAlign: (isRTL ? 'right' : 'left') as 'left' | 'right' };

  return (
    <View style={styles.container}>
      {/* Print-only CSS block embedded in document head */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-packing-area, #print-packing-area * {
            visibility: visible !important;
          }
          #print-packing-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            padding: 20px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

      <View id="print-packing-area" style={{ width: '100%' }}>
        {/* Header Area */}
        <View style={[styles.headerRow, rowStyle]}>
          <Text style={styles.title}>{isRTL ? 'רשימת ציוד לטיול' : 'Trip Packing Checklist'}</Text>
          <TouchableOpacity 
            style={[styles.printButton, { marginLeft: isRTL ? 0 : 'auto', marginRight: isRTL ? 'auto' : 0 }]}
            onPress={handlePrint}
            activeOpacity={0.8}
          >
            <Text style={styles.printButtonText}>🖨️ {isRTL ? 'הדפס רשימה' : 'Print List'}</Text>
          </TouchableOpacity>
        </View>

        {/* Input Bar (Hidden during print) */}
        <div style={{ display: 'flex', ...rowStyle, alignItems: 'center', marginBottom: 20, gap: 10, width: '100%' }} className="no-print">
          <TextInput
            style={[styles.input, textAlignStyle]}
            placeholder={isRTL ? 'הוסף פריט ציוד...' : 'Add gear item...'}
            value={newItemName}
            onChangeText={setNewItemName}
            onKeyPress={(e) => {
              if (e.nativeEvent.key === 'Enter') handleAddItem();
            }}
          />
          <select
            style={selectStyle}
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={handleAddItem}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </div>

        {/* Categories Grid layout */}
        <div style={gridStyle}>
          {categories.map((cat) => {
            const catItems = groupedItems[cat.value] || [];
            return (
              <div key={cat.value} style={categoryCardStyle}>
                <h4 style={{ ...categoryTitleStyle, textAlign: isRTL ? 'right' : 'left' }}>
                  {cat.label} ({catItems.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {catItems.length === 0 ? (
                    <p style={emptyCategoryTextStyle}>{isRTL ? 'אין פריטים בקטגוריה זו' : 'No items added yet'}</p>
                  ) : (
                    catItems.map((item) => (
                      <View 
                        key={item.id} 
                        style={[
                          styles.itemRow, 
                          rowStyle, 
                          item.isPacked && styles.itemRowPacked
                        ]}
                      >
                        <input
                          type="checkbox"
                          checked={item.isPacked}
                          onChange={() => handleToggleItem(item.id, item.isPacked)}
                          style={checkboxStyle}
                        />
                        <Text 
                          style={[
                            styles.itemNameText, 
                            textAlignStyle,
                            item.isPacked && styles.itemNameTextPacked
                          ]}
                        >
                          {item.itemName}
                        </Text>
                        <div style={{ display: 'flex', gap: '6px', marginLeft: isRTL ? 0 : 'auto', marginRight: isRTL ? 'auto' : 0 }} className="no-print">
                          <button 
                            onClick={() => handleDuplicateItem(item)}
                            title={isRTL ? 'שכפל' : 'Duplicate'}
                            style={actionBtnStyle}
                          >
                            👯
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item.id)}
                            title={isRTL ? 'מחק' : 'Delete'}
                            style={{ ...actionBtnStyle, background: '#fff5f5', color: '#fa5252' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </View>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </View>
    </View>
  );
}

// Regular stylesheet for core styles
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
    marginTop: 20,
    width: '100%',
  },
  loaderContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  printButton: {
    backgroundColor: '#f1f3f5',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  printButtonText: {
    color: '#495057',
    fontWeight: '600',
    fontSize: 13,
  },
  inputRow: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
    width: '100%',
  },
  input: {
    flex: 2,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: '#f8f9fa',
  },
  addButton: {
    backgroundColor: '#228be6',
    borderRadius: 8,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  itemRow: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  itemRowPacked: {
    backgroundColor: '#f1f3f5',
    opacity: 0.7,
  },
  itemNameText: {
    flex: 1,
    fontSize: 14,
    color: '#343a40',
    marginLeft: 10,
    marginRight: 10,
  },
  itemNameTextPacked: {
    textDecorationLine: 'line-through',
    color: '#868e96',
  },
});

// Inline DOM styles for CSS Grid layout and web elements
const selectStyle: React.CSSProperties = {
  flex: 1,
  height: '38px',
  borderRadius: '8px',
  borderColor: '#ced4da',
  backgroundColor: '#f8f9fa',
  paddingLeft: '8px',
  paddingRight: '8px',
  fontSize: '14px',
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '16px',
  width: '100%',
  marginTop: '10px',
};

const categoryCardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  border: '1px solid #e9ecef',
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
};

const categoryTitleStyle: React.CSSProperties = {
  margin: '0 0 12px 0',
  fontSize: '15px',
  fontWeight: 'bold',
  color: '#495057',
  borderBottom: '2px solid #e7f5ff',
  paddingBottom: '6px',
};

const emptyCategoryTextStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#adb5bd',
  textAlign: 'center',
  margin: '10px 0',
  fontStyle: 'italic',
};

const checkboxStyle: React.CSSProperties = {
  width: '16px',
  height: '16px',
  cursor: 'pointer',
};

const actionBtnStyle: React.CSSProperties = {
  background: '#f1f3f5',
  border: 'none',
  borderRadius: '4px',
  width: '26px',
  height: '26px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: '12px',
};
