import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { loadSession, setNavigationRef } from './src/services/api';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import RestaurantsScreen from './src/screens/RestaurantsScreen';
import RestaurantDetailScreen from './src/screens/RestaurantDetailScreen';
import AddRestaurantScreen from './src/screens/AddRestaurantScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import DishReviewScreen from './src/screens/DishReviewScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Results" component={ResultsScreen} />
      <Stack.Screen name="RestaurantDetail" component={RestaurantDetailScreen} />
      <Stack.Screen name="DishReview" component={DishReviewScreen} />
    </Stack.Navigator>
  );
}

function ExploreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RestaurantsList" component={RestaurantsScreen} />
      <Stack.Screen name="RestaurantDetail" component={RestaurantDetailScreen} />
      <Stack.Screen name="AddRestaurant" component={AddRestaurantScreen} />
      <Stack.Screen name="DishReview" component={DishReviewScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#aaa',
        tabBarStyle: { borderTopWidth: 0.5, borderTopColor: '#eee' },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, any> = {
            Home: 'home',
            Explore: 'compass',
            Profile: 'person',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Explore" component={ExploreStack} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const navRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    loadSession().then(hasSession => {
      setInitialRoute(hasSession ? 'Main' : 'Login');
    });
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator color="#FF6B35" size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer ref={navRef} onReady={() => setNavigationRef(navRef.current)}>
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Main" component={MainTabs} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
