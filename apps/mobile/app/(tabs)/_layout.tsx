import { Tabs } from 'expo-router'
import { MapPin, Briefcase, DollarSign, User } from 'lucide-react-native'

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarStyle: { backgroundColor: '#0c0c18', borderTopColor: '#222240', paddingBottom: 8, height: 70 },
      tabBarActiveTintColor: '#7c6df5',
      tabBarInactiveTintColor: '#b0b0d0',
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Tasks', tabBarIcon: ({ color }) => <Briefcase size={22} color={color} /> }} />
      <Tabs.Screen name="map" options={{ title: 'Nearby', tabBarIcon: ({ color }) => <MapPin size={22} color={color} /> }} />
      <Tabs.Screen name="earnings" options={{ title: 'Earnings', tabBarIcon: ({ color }) => <DollarSign size={22} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <User size={22} color={color} /> }} />
    </Tabs>
  )
}
