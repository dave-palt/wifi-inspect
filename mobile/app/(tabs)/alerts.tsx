import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Video, AlertTriangle, MapPin, Shield, Zap, RefreshCw } from 'lucide-react-native';
import { useAlerts } from '../../src/hooks/useAlerts';
import { Card } from '../../src/components/Card';
import { Badge } from '../../src/components/Badge';
import type { NetworkAlert } from '@shared/src/types/api';

const getSeverityVariant = (severity: number): 'success' | 'warning' | 'danger' | 'default' => {
  if (severity <= 1) return 'success';
  if (severity <= 2) return 'warning';
  return 'danger';
};

const getAlertIcon = (type: string) => {
  const iconProps = { size: 22, color: '#94a3b8' };
  switch (type) {
    case 'cameras_detected': return <Video {...iconProps} color="#ef4444" />;
    case 'suspicious': return <AlertTriangle {...iconProps} color="#f59e0b" />;
    case 'high_risk_area': return <MapPin {...iconProps} color="#ef4444" />;
    case 'known_threat': return <Shield {...iconProps} color="#ef4444" />;
    default: return <Zap {...iconProps} />;
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
    <View className="mx-5 mb-3">
      <Card>
        <View className="p-4 flex-row gap-4">
          <View className="w-11 h-11 rounded-xl bg-slate-700/50 items-center justify-center">
            {getAlertIcon(item.type)}
          </View>
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-white font-semibold text-base flex-1 capitalize">
                {item.type.replace(/_/g, ' ')}
              </Text>
              <Badge variant={getSeverityVariant(item.severity)}>
                Sev {item.severity}
              </Badge>
            </View>
            <Text className="text-slate-300 text-sm leading-5">{item.description}</Text>
            <Text className="text-slate-500 text-xs mt-2">
              {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>
      </Card>
    </View>
  );

  return (
    <View className="flex-1 bg-slate-950">
      <View className="px-5 py-4 border-b border-slate-800">
        <Text className="text-white text-2xl font-bold">Alerts</Text>
        <Text className="text-slate-400 text-sm mt-1">
          {alerts.length} alert{alerts.length !== 1 ? 's' : ''} from nearby networks
        </Text>
      </View>
      <FlatList
        data={alerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingVertical: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20 px-5">
            <View className="w-16 h-16 rounded-full bg-emerald-900/30 items-center justify-center mb-4">
              <Shield size={32} color="#22c55e" />
            </View>
            <Text className="text-white text-xl font-semibold mb-2">No alerts</Text>
            <Text className="text-slate-400 text-center mb-6">
              No suspicious networks have been reported in your area
            </Text>
            <TouchableOpacity 
              className="flex-row items-center gap-2 px-4 py-2 rounded-full bg-slate-800"
              onPress={onRefresh}
            >
              <RefreshCw size={16} color="#94a3b8" />
              <Text className="text-slate-300 text-sm">Check for alerts</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}
