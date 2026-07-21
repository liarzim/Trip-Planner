import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  SafeAreaView, 
  ActivityIndicator 
} from 'react-native';
import { signOut } from 'firebase/auth';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { auth } from '../config/firebaseConfig';
import { getTripsForUser } from '../services/dbService';
import { Trip } from '../types';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { useTranslation } from '../services/translationService';
import LanguageSelector from '../components/LanguageSelector';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const { t, isRTL } = useTranslation();

  const user = auth.currentUser;
  const welcomeName = user?.displayName || user?.email || 'Traveler';

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      const fetchTrips = async () => {
        if (!user) return;
        try {
          setLoading(true);
          const data = await getTripsForUser(user.uid);
          if (active) {
            setTrips(data);
          }
        } catch (error) {
          console.error('Failed to fetch trips:', error);
        } finally {
          if (active) {
            setLoading(false);
          }
        }
      };

      fetchTrips();

      return () => {
        active = false;
      };
    }, [user])
  );

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return { bg: colors.primaryLight, text: colors.primary };
      case 'planned':
      default:
        return { bg: colors.secondaryLight, text: colors.secondary };
    }
  };

  const renderTripItem = ({ item }: { item: Trip }) => {
    const statusStyle = getStatusBadgeStyle(item.status);
    const dateRange = isRTL 
      ? `📅  ${item.startDate} עד ${item.endDate}` 
      : `📅  ${item.startDate} to ${item.endDate}`;

    return (
      <TouchableOpacity 
        style={[styles.tripCard, { direction: isRTL ? 'rtl' : 'ltr' }]}
        onPress={() => navigation.navigate('TripDashboard', { tripId: item.id })}
        activeOpacity={0.8}
      >
        <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.tripName, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {t(`home.${item.status.toLowerCase()}`).toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={[styles.cardFooter, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.tripDate, { textAlign: isRTL ? 'right' : 'left' }]}>
            {dateRange}
          </Text>
          <Text style={[styles.arrowIcon, { transform: [{ scaleX: isRTL ? -1 : 1 }] }]}>→</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const rowDirectionStyle = { flexDirection: (isRTL ? 'row-reverse' : 'row') as 'row' | 'row-reverse' };
  const textAlignStyle = { textAlign: (isRTL ? 'right' : 'left') as 'left' | 'right' };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, rowDirectionStyle]}>
        <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={styles.welcomeText}>{t('home.welcome')},</Text>
          <Text style={styles.userName}>{welcomeName}</Text>
        </View>
        <View style={[styles.headerRight, rowDirectionStyle]}>
          <LanguageSelector />
          <TouchableOpacity 
            style={[
              styles.signOutButton, 
              { 
                marginLeft: isRTL ? 0 : 10, 
                marginRight: isRTL ? 10 : 0 
              }
            ]} 
            onPress={handleSignOut}
          >
            <Text style={styles.signOutText}>{t('home.sign_out')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.content, { direction: isRTL ? 'rtl' : 'ltr' }]}>
        <Text style={[styles.sectionTitle, textAlignStyle]}>{t('home.my_trips')}</Text>
        
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={trips}
            keyExtractor={(item) => item.id}
            renderItem={renderTripItem}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>{t('home.no_trips')}</Text>
                <Text style={styles.emptySubText}>{t('home.create_first')}</Text>
              </View>
            }
          />
        )}
      </View>

      {/* Floating Action Button for Trip Creation */}
      <TouchableOpacity 
        style={[
          styles.fab, 
          isRTL ? { left: 24, right: undefined } : { right: 24, left: undefined }
        ]} 
        onPress={() => navigation.navigate('CreateTrip')}
        activeOpacity={0.9}
      >
        <Text style={styles.fabText}>+ {t('home.add_trip')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRight: {
    alignItems: 'center',
  },
  welcomeText: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.textLight,
  },
  userName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  signOutButton: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: '#fff5f5',
    borderWidth: 1,
    borderColor: '#ffe3e3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    color: colors.error,
    fontWeight: typography.weights.semibold,
    fontSize: typography.sizes.sm,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingBottom: 90, 
  },
  tripCard: {
    backgroundColor: colors.card,
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    minHeight: 88,
  },
  cardHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripName: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusText: {
    fontFamily: typography.fontFamily,
    fontSize: 9,
    fontWeight: typography.weights.bold,
  },
  cardFooter: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripDate: {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    color: colors.textLight,
    flex: 1,
  },
  arrowIcon: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontFamily: typography.fontFamily,
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    marginBottom: 6,
  },
  emptySubText: {
    fontFamily: typography.fontFamily,
    color: colors.textLight,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    backgroundColor: colors.primary,
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    color: colors.white,
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.md,
  },
});
