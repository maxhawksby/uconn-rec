import React, { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import type { AppState, ID, WorkoutPhoto } from '../data/types';
import { MAX_PHOTOS, studentById } from '../data/selectors';
import { Icon, Text } from '../ui';
import { colors, hitSlop, minTouch, radius, space } from '../theme';
import { photoSource } from './photoSource';

export type PickedPhoto = { uri: string; mimeType?: string };

/** Opens the photo library. Quality < 1 re-encodes to JPEG, which keeps uploads small. */
export async function pickPhotos(remaining: number): Promise<PickedPhoto[]> {
  if (remaining <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: remaining, quality: 0.7,
  });
  if (result.canceled) return [];
  return result.assets.slice(0, remaining).map(a => ({ uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg' }));
}

/** Feed card: the first photo runs edge to edge, with a count when there are more. */
export function CardPhoto({ photos }: { photos: WorkoutPhoto[] }) {
  if (!photos.length) return null;
  return (
    <View style={styles.cardPhoto} accessible accessibilityRole="image" accessibilityLabel={`${photos.length} ${photos.length === 1 ? 'photo' : 'photos'}`}>
      <Image source={photoSource(photos[0].uri)} style={styles.fill} resizeMode="cover" />
      {photos.length > 1 ? (
        <View style={styles.count}>
          <Icon name="images-outline" size={14} color="onBoard" />
          <Text variant="statLabel" color="onBoard">{photos.length}</Text>
        </View>
      ) : null}
    </View>
  );
}

type GalleryProps = {
  state: AppState;
  photos: WorkoutPhoto[];
  canAdd: boolean;
  /** Who may remove a given photo (the uploader or the workout's owner). */
  canRemove: (photo: WorkoutPhoto) => boolean;
  onAdd: () => void;
  onRemove: (photoId: ID) => void;
};

/** Detail screen: a row of tiles, an Add tile for the crew, and a full-screen viewer. */
export function PhotoGallery({ state, photos, canAdd, canRemove, onAdd, onRemove }: GalleryProps) {
  const [open, setOpen] = useState<number | null>(null);
  const room = photos.length < MAX_PHOTOS;
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.rowScroll}>
        {photos.map((p, i) => (
          <Pressable key={p.id} onPress={() => setOpen(i)} accessibilityRole="imagebutton"
            accessibilityLabel={`Photo ${i + 1} of ${photos.length}, added by ${studentById(state, p.studentId)?.firstName ?? 'a classmate'}. Open`}
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
            <Image source={photoSource(p.uri)} style={styles.fill} resizeMode="cover" />
          </Pressable>
        ))}
        {canAdd && room ? (
          <Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel="Add photos"
            style={({ pressed }) => [styles.tile, styles.addTile, pressed && styles.addPressed]}>
            <Icon name="camera-outline" size={26} color="inkSoft" />
            <Text variant="smallStrong" color="inkSoft">Add photo</Text>
          </Pressable>
        ) : null}
      </ScrollView>
      <PhotoViewer state={state} photos={photos} index={open} canRemove={canRemove} onClose={() => setOpen(null)}
        onRemove={id => { setOpen(null); onRemove(id); }} />
    </>
  );
}

type ViewerProps = {
  state: AppState;
  photos: WorkoutPhoto[];
  index: number | null;
  canRemove: (photo: WorkoutPhoto) => boolean;
  onClose: () => void;
  onRemove: (photoId: ID) => void;
};

function PhotoViewer({ state, photos, index, canRemove, onClose, onRemove }: ViewerProps) {
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [height, setHeight] = useState(0); // measured: pages need a real height for the photo to fill
  const current = photos[index === null ? 0 : page];
  const by = current ? studentById(state, current.studentId) : undefined;
  return (
    <Modal visible={index !== null} animationType="fade" onRequestClose={onClose} onShow={() => setPage(index ?? 0)} statusBarTranslucent>
      <SafeAreaView style={styles.viewer} edges={['top', 'bottom']}>
        <View style={styles.viewerBar}>
          <Text variant="statLabel" color="onBoardMuted" style={styles.flex}>
            {photos.length > 1 ? `${page + 1} / ${photos.length} · ` : ''}{by ? `Added by ${by.firstName}` : ''}
          </Text>
          {current && canRemove(current) ? (
            <Pressable onPress={() => onRemove(current.id)} hitSlop={hitSlop} accessibilityRole="button" accessibilityLabel="Remove this photo" style={styles.barButton}>
              <Icon name="trash-outline" size={22} color="onBoard" />
            </Pressable>
          ) : null}
          <Pressable onPress={onClose} hitSlop={hitSlop} accessibilityRole="button" accessibilityLabel="Close photos" style={styles.barButton}>
            <Icon name="close" size={26} color="onBoard" />
          </Pressable>
        </View>
        <View style={styles.flex} onLayout={e => setHeight(e.nativeEvent.layout.height)}>
          {height ? (
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentOffset={{ x: (index ?? 0) * width, y: 0 }}
              onMomentumScrollEnd={e => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}>
              {photos.map(p => (
                <Image key={p.id} source={photoSource(p.uri)} style={{ width, height }} resizeMode="contain" accessibilityIgnoresInvertColors />
              ))}
            </ScrollView>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const TILE_W = 132;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  fill: { width: '100%', height: '100%' },
  cardPhoto: { aspectRatio: 4 / 3, backgroundColor: colors.sunken, marginBottom: space.md },
  count: {
    position: 'absolute', right: space.md, bottom: space.md, flexDirection: 'row', alignItems: 'center', gap: space.xs,
    backgroundColor: colors.board, borderRadius: radius.sm, paddingHorizontal: space.sm, paddingVertical: space.xs,
  },
  rowScroll: { marginHorizontal: -space.xl },
  row: { gap: space.sm, paddingHorizontal: space.xl },
  tile: { width: TILE_W, height: TILE_W * 4 / 3, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.sunken },
  pressed: { opacity: 0.8 },
  addTile: { alignItems: 'center', justifyContent: 'center', gap: space.sm, borderWidth: 1, borderColor: colors.line },
  addPressed: { backgroundColor: colors.line },
  viewer: { flex: 1, backgroundColor: colors.board },
  viewerBar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: space.xl, paddingRight: space.sm, minHeight: minTouch + 8 },
  barButton: { width: minTouch, height: minTouch, alignItems: 'center', justifyContent: 'center' },
});
