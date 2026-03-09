import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Radio, Smartphone, Bell, Settings, Shield } from 'lucide-react-native';
import { colors } from '../../src/utils/design';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const color = focused ? colors.primary : colors.text.tertiary;
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
          backgroundColor: colors.surface,
          borderTopColor: colors.border.subtle,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        headerStyle: { 
          backgroundColor: colors.surface,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.text.primary,
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
