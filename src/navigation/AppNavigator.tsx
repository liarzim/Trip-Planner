import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import CreateTripScreen from '../screens/CreateTripScreen';
import TripDashboardScreen from '../screens/TripDashboardScreen';
import AddEventScreen from '../screens/AddEventScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';

// Stack navigation parameter types
export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  CreateTrip: undefined;
  TripDashboard: { tripId: string };
  AddEvent: { tripId: string };
  AddExpense: { tripId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Listen to Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (initializing) {
        setInitializing(false);
      }
    });

    // Clean up subscription
    return unsubscribe;
  }, [initializing]);

  // Loading spinner while checking initial auth status
  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#228be6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {user ? (
          <>
            <Stack.Screen 
              name="Home" 
              component={HomeScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="CreateTrip" 
              component={CreateTripScreen} 
              options={{ title: 'Plan New Trip', headerBackTitle: 'Back' }} 
            />
            <Stack.Screen 
              name="TripDashboard" 
              component={TripDashboardScreen} 
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="AddEvent" 
              component={AddEventScreen} 
              options={{ title: 'Add Event', headerBackTitle: 'Back' }} 
            />
            <Stack.Screen 
              name="AddExpense" 
              component={AddExpenseScreen} 
              options={{ title: 'Add Expense', headerBackTitle: 'Back' }} 
            />
          </>
        ) : (
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ headerShown: false }} 
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
});
