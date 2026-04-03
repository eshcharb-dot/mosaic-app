import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/lib/ThemeContext';

interface Badge {
  badge_id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  earned: boolean;
  earned_at: string | null;
}

const TIER_COLORS = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  platinum: '#e5e4e2',
};

export default function BadgesScreen() {
  const { tokens } = useAppTheme();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.rpc('get_collector_badges', { p_collector_id: user.id });
      setBadges(data ?? []);
      setLoading(false);
    })();
  }, []);

  const categories = ['All', 'milestone', 'quality', 'streak', 'speed'];
  const filtered = activeCategory === 'All' ? badges : badges.filter(b => b.category === activeCategory);
  const earnedCount = badges.filter(b => b.earned).length;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.bg }}>
        <ActivityIndicator color={tokens.purple} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: tokens.bg }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
      {/* Header */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: tokens.text, letterSpacing: -0.5 }}>Badges</Text>
        <Text style={{ color: tokens.muted, fontSize: 14, marginTop: 4 }}>{earnedCount} of {badges.length} earned</Text>
        {/* Progress bar */}
        <View style={{ height: 4, backgroundColor: tokens.border, borderRadius: 2, marginTop: 10 }}>
          <View style={{ height: 4, backgroundColor: tokens.purple, borderRadius: 2, width: `${badges.length > 0 ? (earnedCount / badges.length) * 100 : 0}%` }} />
        </View>
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 8 }}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            onPress={() => setActiveCategory(cat)}
            style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, backgroundColor: activeCategory === cat ? tokens.purple : tokens.card, borderWidth: 1, borderColor: activeCategory === cat ? tokens.purple : tokens.border }}
          >
            <Text style={{ color: activeCategory === cat ? '#fff' : tokens.muted, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' }}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Badge grid — 2 columns */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {filtered.map(badge => (
          <View
            key={badge.badge_id}
            style={{
              width: '47%',
              backgroundColor: tokens.card,
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: badge.earned ? TIER_COLORS[badge.tier] + '80' : tokens.border,
              opacity: badge.earned ? 1 : 0.5,
            }}
          >
            <Text style={{ fontSize: 32, marginBottom: 8 }}>{badge.earned ? badge.icon : '🔒'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: badge.earned ? tokens.text : tokens.muted, flex: 1 }} numberOfLines={1}>{badge.name}</Text>
            </View>
            <Text style={{ fontSize: 12, color: tokens.muted, lineHeight: 16, marginBottom: 8 }} numberOfLines={2}>{badge.description}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ backgroundColor: TIER_COLORS[badge.tier] + '22', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: TIER_COLORS[badge.tier], textTransform: 'uppercase', letterSpacing: 0.5 }}>{badge.tier}</Text>
              </View>
              {badge.earned && badge.earned_at && (
                <Text style={{ fontSize: 10, color: tokens.muted }}>{new Date(badge.earned_at).toLocaleDateString()}</Text>
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
