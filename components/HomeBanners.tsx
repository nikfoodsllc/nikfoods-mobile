import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, LayoutAnimation, Pressable, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Text, tap } from '@/components/ui';
import type { SharedValue } from 'react-native-reanimated';
import { C, S, shadow } from '@/constants/theme';

// The banners the admin sets up (Food Catalog > Banners): the same list the website shows. Each picture keeps its own shape, so the
// strip is as tall as the picture on show. With no banners nothing is drawn.
interface Banner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkType: 'none' | 'category' | 'url';
  categoryId: string;
  url: string;
  /** seconds this banner stays on show (the admin chooses; 5 when missing) */
  durationSeconds?: number;
}

const DEFAULT_SECONDS = 5;
const DEFAULT_RATIO = 2; // until a picture has loaded
let cached: Banner[] | null = null;

const RADIUS = 20; // gentle corners: a rounder frame cut into the corners of the pictures

// `scrollY` is still passed by Home; the picture no longer drifts with it, so its whole edge stays visible.
export default function HomeBanners(_props: { scrollY?: SharedValue<number> }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [banners, setBanners] = useState<Banner[]>(cached ?? []);
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const [index, setIndex] = useState(0);
  const [touching, setTouching] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const list = useRef<FlatList<Banner>>(null);
  const w = width - S.xl * 2;

  useEffect(() => {
    let live = true;
    fetch('/api/banners')
      .then((r) => r.json())
      .then((j) => {
        if (!live) return;
        const next: Banner[] = Array.isArray(j?.data) ? j.data : [];
        cached = next;
        setBanners(next);
      })
      .catch(() => undefined);
    AccessibilityInfo.isReduceMotionEnabled().then((v) => live && setReduceMotion(v)).catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  const count = banners.length;

  useEffect(() => {
    if (count < 2 || touching || reduceMotion) return;
    // each banner stays for the time the admin chose for it, then the next one slides in
    const stay = Math.min(60, Math.max(2, Number(banners[index]?.durationSeconds) || DEFAULT_SECONDS)) * 1000;
    const t = setTimeout(() => {
      const next = (index + 1) % count;
      list.current?.scrollToOffset({ offset: next * w, animated: true });
      setIndex(next);
    }, stay);
    return () => clearTimeout(t);
  }, [count, touching, reduceMotion, index, w, banners]);

  const open = useCallback(
    (b: Banner) => {
      if (b.linkType === 'category' && b.categoryId) {
        tap();
        router.push({ pathname: '/menu/[id]', params: { id: b.categoryId } });
      } else if (b.linkType === 'url' && /^https:\/\//i.test(b.url)) {
        tap();
        void WebBrowser.openBrowserAsync(b.url);
      }
    },
    [router]
  );

  if (!count) return null;
  const current = banners[Math.min(index, count - 1)];
  const height = Math.round(w / (ratios[current?.id] || DEFAULT_RATIO));

  return (
    <View style={{ gap: S.sm }} accessibilityLabel="Promotions">
      <View style={[{ height, borderRadius: RADIUS, backgroundColor: C.surface }, shadow]}>
        <View style={{ flex: 1, borderRadius: RADIUS, overflow: 'hidden' }}>
        <FlatList
          ref={list}
          data={banners}
          keyExtractor={(b) => b.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScrollBeginDrag={() => setTouching(true)}
          onScrollEndDrag={() => setTouching(false)}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / w);
            if (i !== index) {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setIndex(i);
            }
          }}
          getItemLayout={(_, i) => ({ length: w, offset: w * i, index: i })}
          renderItem={({ item }) => {
            const ratio = ratios[item.id] || DEFAULT_RATIO;
            const linked = item.linkType === 'category' ? Boolean(item.categoryId) : item.linkType === 'url' && /^https:\/\//i.test(item.url);
            return (
              <Pressable
                onPress={linked ? () => open(item) : undefined}
                disabled={!linked}
                accessibilityRole={linked ? 'button' : 'image'}
                accessibilityLabel={[item.title, item.subtitle].filter(Boolean).join('. ') || 'NikFoods'}
                style={{ width: w }}
              >
                <View style={{ height: Math.round(w / ratio) }}>
                <Image
                  source={{ uri: item.imageUrl }}
                  style={{ width: w, height: Math.round(w / ratio) }}
                  contentFit="cover"
                  transition={250}
                  onLoad={(e) => {
                    const { width: iw, height: ih } = e.source;
                    if (iw && ih) setRatios((r) => (r[item.id] ? r : { ...r, [item.id]: iw / ih }));
                  }}
                />
                </View>
                {(item.title || item.subtitle) && (
                  <LinearGradient colors={['rgba(26,20,16,0)', 'rgba(26,20,16,0.72)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: S.lg, paddingTop: 44 }} pointerEvents="none">
                    {item.title ? <Text weight="display" size={26} color="#fff">{item.title}</Text> : null}
                    {item.subtitle ? <Text size={13} color="rgba(255,255,255,0.92)" style={{ marginTop: 2 }}>{item.subtitle}</Text> : null}
                  </LinearGradient>
                )}
              </Pressable>
            );
          }}
        />
        </View>
      </View>
      {count > 1 && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }} accessibilityElementsHidden>
          {banners.map((b, i) => (
            <View key={b.id} style={{ width: i === index ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === index ? C.ink : C.line }} />
          ))}
        </View>
      )}
    </View>
  );
}
