import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/lib/ThemeContext';
import { useLayout } from '@/lib/useLayout';

interface TaskHistory {
  id: string;
  status: string;
  updated_at: string;
  campaigns: { name: string; price_per_task_cents: number } | null;
  stores: { name: string; city: string } | null;
  submissions: Array<{
    id: string;
    compliance_results: Array<{ overall_score: number }> | null;
  }> | null;
}

const SCORE_COLOR = (score: number | null) => {
  if (score == null) return '#b0b0d0';
  if (score >= 80) return '#00e096';
  if (score >= 60) return '#ffaa00';
  return '#ff4d6d';
};

export default function HistoryScreen() {
  const { tokens } = useAppTheme();
  const { mode } = useLayout();
  const [tasks, setTasks] = useState<TaskHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'scored' | 'submitted'>('all');

  const fetchHistory = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const query = supabase
      .from('tasks')
      .select(`
        id, status, updated_at,
        campaigns (name, price_per_task_cents),
        stores (name, city),
        submissions (
          id,
          compliance_results (overall_score)
        )
      `)
      .eq('assigned_to', user.id)
      .in('status', ['submitted', 'scored'])
      .order('updated_at', { ascending: false })
      .limit(50);

    const { data } = await query;
    setTasks((data as TaskHistory[]) ?? []);
  }, []);

  useEffect(() => {
    fetchHistory().finally(() => setLoading(false));
  }, [fetchHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHistory();
    setRefreshing(false);
  }, [fetchHistory]);

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);

  const totalEarned = tasks.reduce((sum, t) => sum + (t.campaigns?.price_per_task_cents ?? 0), 0);
  const avgScore = (() => {
    const scored = tasks.filter(t => t.submissions?.[0]?.compliance_results?.[0]?.overall_score != null);
    if (scored.length === 0) return null;
    return Math.round(scored.reduce((s, t) => s + (t.submissions![0].compliance_results![0].overall_score), 0) / scored.length);
  })();

  const renderItem = ({ item }: { item: TaskHistory }) => {
    const score = item.submissions?.[0]?.compliance_results?.[0]?.overall_score ?? null;
    const payout = item.campaigns?.price_per_task_cents ?? 0;

    return (
      <View style={{
        backgroundColor: tokens.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: tokens.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
      }}>
        {/* Score circle */}
        <View style={{
          width: 52, height: 52, borderRadius: 26,
          borderWidth: 2, borderColor: SCORE_COLOR(score),
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: `${SCORE_COLOR(score)}15`,
        }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: SCORE_COLOR(score) }}>
            {score != null ? `${score}` : '—'}
          </Text>
        </View>

        {/* Details */}
        <View style={{ flex: 1 }}>
          <Text style={{ color: tokens.text, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
            {item.stores?.name ?? 'Unknown Store'}
          </Text>
          <Text style={{ color: tokens.muted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
            {item.campaigns?.name ?? 'Unknown Campaign'} · {item.stores?.city ?? ''}
          </Text>
          <Text style={{ color: tokens.muted, fontSize: 11, marginTop: 4 }}>
            {new Date(item.updated_at).toLocaleDateString()}
          </Text>
        </View>

        {/* Payout */}
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: tokens.green, fontSize: 16, fontWeight: '700' }}>
            £{(payout / 100).toFixed(2)}
          </Text>
          <View style={{
            marginTop: 4, paddingHorizontal: 8, paddingVertical: 2,
            borderRadius: 100, backgroundColor: item.status === 'scored' ? `${tokens.green}22` : `${tokens.cyan}22`,
          }}>
            <Text style={{ fontSize: 10, fontWeight: '600', color: item.status === 'scored' ? tokens.green : tokens.cyan, textTransform: 'uppercase' }}>
              {item.status}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.bg }}>
        <ActivityIndicator color={tokens.purple} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: tokens.bg }}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.purple} />}
        ListHeaderComponent={
          <View style={{ padding: 20, paddingBottom: 0 }}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: tokens.text, letterSpacing: -0.5, marginBottom: 4 }}>History</Text>
            <Text style={{ color: tokens.muted, fontSize: 14, marginBottom: 20 }}>{tasks.length} completed tasks</Text>

            {/* Summary stats */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
              <View style={{ flex: 1, backgroundColor: tokens.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: tokens.border }}>
                <Text style={{ color: tokens.muted, fontSize: 12 }}>Total Earned</Text>
                <Text style={{ color: tokens.green, fontSize: 22, fontWeight: '800', marginTop: 4 }}>£{(totalEarned / 100).toFixed(2)}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: tokens.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: tokens.border }}>
                <Text style={{ color: tokens.muted, fontSize: 12 }}>Avg Score</Text>
                <Text style={{ color: avgScore != null ? SCORE_COLOR(avgScore) : tokens.muted, fontSize: 22, fontWeight: '800', marginTop: 4 }}>
                  {avgScore != null ? `${avgScore}%` : '—'}
                </Text>
              </View>
            </View>

            {/* Filter chips */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {(['all', 'scored', 'submitted'] as const).map(f => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, backgroundColor: filter === f ? tokens.purple : tokens.card, borderWidth: 1, borderColor: filter === f ? tokens.purple : tokens.border }}
                >
                  <Text style={{ color: filter === f ? '#fff' : tokens.muted, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' }}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ padding: 60, alignItems: 'center' }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
            <Text style={{ color: tokens.text, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>No tasks yet</Text>
            <Text style={{ color: tokens.muted, fontSize: 14, textAlign: 'center' }}>Complete tasks to see your history here</Text>
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
      />
    </View>
  );
}
