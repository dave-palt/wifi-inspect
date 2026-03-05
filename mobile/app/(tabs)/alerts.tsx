import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useAlerts } from '../../src/hooks/useAlerts';
import type { NetworkAlert } from '@shared/src/types/api';

const getSeverityColor = (severity: number) => {
  if (severity <= 1) return 'text-green-400';
  if (severity <= 2) return 'text-yellow-400';
  if (severity <= 3) return 'text-orange-400';
  return 'text-red-500';
};

const getAlertIcon = (type: string) => {
  switch (type) {
    case 'cameras_detected': return '📹';
    case 'suspicious': return '⚠️';
    case 'high_risk_area': return '📍';
    case 'known_threat': return '🚨';
    default: return '⚡';
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
};

export default function AlertsScreen() {
  const { alerts, loading, refreshAlerts } = useAlerts();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAlerts();
    setRefreshing(false);
  }, [refreshAlerts]);

  const renderAlert = ({ item }: { item: NetworkAlert }) => (
    <View className="bg-slate-800 rounded-xl p-4 mb-3 border border-slate-700">
      <View className="flex-row items-start gap-3">
        <Text className="text-2xl">{getAlertIcon(item.type)}</Text>
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="text-white font-semibold">{item.type.replace(/_/g, ' ')}</Text>
            <View className="flex-row items-center gap-2">
              {[...Array(5)].map((_, i) => (
                <View
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    i < item.severity ? 'bg-red-500' : 'bg-slate-600'
                  }`}
                />
              ))}
            </View>
          </View>
          <Text className="text-slate-300 mt-1">{item.description}</Text>
          <Text className="text-slate-500 text-sm mt-2">
            {formatDate(item.createdAt)}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-slate-900">
      <View className="px-4 py-3 border-b border-slate-700">
        <Text className="text-slate-400 text-sm">
          {alerts.length} alert{alerts.length !== 1 ? 's' : ''} from nearby networks
        </Text>
      </View>
      <FlatList
        data={alerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item.id.toString()}
        contentContainerClassName="p-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
          />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-4xl mb-4">✅</Text>
            <Text className="text-white text-lg mb-2">No alerts</Text>
            <Text className="text-slate-400 text-center">
              No suspicious networks reported in your area
            </Text>
          </View>
        }
      />
    </View>
  );
}
