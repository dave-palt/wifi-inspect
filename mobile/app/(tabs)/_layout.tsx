import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Radio, Smartphone, Bell, Settings, Shield } from 'lucide-react-native';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const color = focused ? '#3b82f6' : '#64748b';
  const size = 22;

  switch (name) {
    case 'scan': return <Radio size={size} color={color} />;
    case 'devices': return <Smartphone size={size} color={color} />;
    case 'threats': return <Shield size={size} color={color} />;
    case 'alerts': return <Bell size={size} color={color} />;
    case 'settings': return <Settings size={size} color={color} />;
    default: return null;
  }
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#141419',
          borderTopColor: '#1e293b',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        headerStyle: { 
          backgroundColor: '#141419',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#f8fafc',
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Scan',
          tabBarIcon: ({ focused }) => <TabIcon name="scan" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="threats"
        options={{
          title: 'Threats',
          tabBarIcon: ({ focused }) => <TabIcon name="threats" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="devices"
        options={{
          title: 'Devices',
          tabBarIcon: ({ focused }) => <TabIcon name="devices" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ focused }) => <TabIcon name="alerts" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
