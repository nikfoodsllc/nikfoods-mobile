import React, { useRef, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/constants/theme';
import { Text, tap } from '@/components/ui';
import { useAutoAdvance } from '@/lib/useAutoAdvance';

/** the photos move on by themselves this often (waits while touched or zoomed, off for Reduce Motion) */
const AUTO_ADVANCE_MS = 4000;

/**
 * The photo(s) of a dish at the top of its sheet. With more than one photo they page sideways with dots; the + button
 * opens a photo full screen, where you pinch to zoom (and drag around) and swipe to the next photo. An animated GIF keeps
 * moving (expo-image plays it).
 */
export default function ItemGallery({ name, images, radius = 36, aspectRatio = 1.25 }: { name: string; images: string[]; radius?: number; aspectRatio?: number }) {
  const list = images.filter(Boolean);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [zoomAt, setZoomAt] = useState<number | null>(null);
  const many = list.length > 1;
  const strip = useRef<FlatList<string>>(null);
  const [holding, setHolding] = useState(false);
  useAutoAdvance(many && !holding && zoomAt === null && width > 0, AUTO_ADVANCE_MS, index, () => {
    const next = (index + 1) % list.length;
    setIndex(next);
    strip.current?.scrollToOffset({ offset: next * width, animated: true });
  });
  if (list.length === 0) return <View style={{ width: '100%', aspectRatio, borderRadius: radius, backgroundColor: C.surface }} />;

  return (
    <View style={{ width: '100%', aspectRatio, borderRadius: radius, overflow: 'hidden', backgroundColor: C.surface }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <FlatList
          ref={strip}
          data={list}
          keyExtractor={(u, i) => `${i}-${u}`}
          horizontal
          pagingEnabled
          scrollEnabled={many}
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onScrollBeginDrag={() => setHolding(true)}
          onScrollEndDrag={() => setHolding(false)}
          onMomentumScrollEnd={(e) => {
            setHolding(false);
            setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
          }}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={{ width, height: '100%' }} contentFit="cover" transition={150} accessibilityLabel={name} />
          )}
        />
      )}
      {many && (
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          {list.map((_, i) => (
            <View key={i} style={{ width: i === index ? 18 : 7, height: 7, borderRadius: 4, backgroundColor: i === index ? C.brand : 'rgba(255,255,255,0.95)', borderWidth: i === index ? 0 : 1, borderColor: 'rgba(26,20,16,0.3)' }} />
          ))}
        </View>
      )}
      {/* the zoom button: a plus, bottom right */}
      <Pressable
        onPress={() => { tap(); setZoomAt(index); }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Zoom photo"
        style={{ position: 'absolute', right: 14, bottom: 14, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.line }}
      >
        <Ionicons name="add" size={26} color={C.ink} />
      </Pressable>
      <Zoomer images={list} startIndex={zoomAt} onClose={() => setZoomAt(null)} />
    </View>
  );
}

/** Full-screen viewer: swipe between photos, pinch to zoom, drag a zoomed photo around. */
function Zoomer({ images, startIndex, onClose }: { images: string[]; startIndex: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [at, setAt] = useState(0);
  const scroller = useRef<ScrollView>(null);
  if (startIndex === null) return null;
  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: '#0b0b0b' }}>
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: width * startIndex, y: 0 }}
          onMomentumScrollEnd={(e) => setAt(Math.round(e.nativeEvent.contentOffset.x / width))}
          onLayout={() => setAt(startIndex)}
        >
          {images.map((uri, i) => (
            // each photo is its own zoomable page (pinch zoom up to 4x; drag when zoomed)
            <ScrollView
              key={`${i}-${uri}`}
              style={{ width, height }}
              contentContainerStyle={{ width, height, alignItems: 'center', justifyContent: 'center' }}
              minimumZoomScale={1}
              maximumZoomScale={4}
              bouncesZoom
              centerContent
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
            >
              <Image source={{ uri }} style={{ width, height }} contentFit="contain" />
            </ScrollView>
          ))}
        </ScrollView>
        <View style={{ position: 'absolute', top: insets.top + 10, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }} pointerEvents="box-none">
          <Text weight="semibold" size={14} color="#fff">{images.length > 1 ? `${at + 1} / ${images.length}` : ''}</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={22} color={C.ink} />
          </Pressable>
        </View>
        <Text size={12} color="rgba(255,255,255,0.7)" style={{ position: 'absolute', bottom: insets.bottom + 18, alignSelf: 'center' }}>Pinch to zoom</Text>
      </View>
    </Modal>
  );
}
