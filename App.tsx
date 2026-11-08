import {
  BottomSheetFooter,
  type BottomSheetFooterProps,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetScrollView,
  useBottomSheetInternal,
} from '@gorhom/bottom-sheet';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { runOnJS, useAnimatedReaction } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

const SNAP_POINTS = ['100%'];
const ROWS = Array.from({ length: 30 }, (_, index) => `Row ${index + 1}`);

function SaveFooter(props: BottomSheetFooterProps) {
  const insets = useSafeAreaInsets();

  return (
    <BottomSheetFooter {...props} bottomInset={insets.bottom}>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Footer: should always be visible</Text>
      </View>
    </BottomSheetFooter>
  );
}

function LayoutReadout() {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <Text style={styles.readout}>
      window {Math.round(window.width)}×{Math.round(window.height)} · insets.top {insets.top}
    </Text>
  );
}

function SheetLayoutReadout() {
  const { animatedLayoutState, animatedPosition, animatedDetentsState } = useBottomSheetInternal();
  const [readout, setReadout] = useState('');

  useAnimatedReaction(
    () => {
      const { containerHeight, rawContainerHeight } = animatedLayoutState.get();
      const detents = animatedDetentsState.get().detents ?? [];
      return `containerHeight ${Math.round(containerHeight)} · raw ${Math.round(rawContainerHeight)} · position ${Math.round(animatedPosition.get())} · detents [${detents.map(Math.round).join(', ')}]`;
    },
    (next, previous) => {
      if (next !== previous) {
        runOnJS(setReadout)(next);
      }
    },
  );

  return <Text style={styles.readout}>{readout}</Text>;
}

function Screen() {
  const sheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();

  function handleOpen() {
    sheetRef.current?.present();
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <LayoutReadout />
      <Pressable accessibilityRole="button" onPress={handleOpen} style={styles.button}>
        <Text style={styles.buttonText}>Open sheet</Text>
      </Pressable>
      <BottomSheetModal
        enableDynamicSizing={false}
        footerComponent={SaveFooter}
        ref={sheetRef}
        snapPoints={SNAP_POINTS}
        topInset={insets.top}
      >
        <BottomSheetScrollView contentContainerStyle={styles.content}>
          <LayoutReadout />
          <SheetLayoutReadout />
          {ROWS.map((row) => (
            <Text key={row} style={styles.row}>
              {row}
            </Text>
          ))}
        </BottomSheetScrollView>
      </BottomSheetModal>
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <Screen />
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  screen: {
    flex: 1,
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#e5e7eb',
  },
  readout: {
    fontVariant: ['tabular-nums'],
    padding: 8,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 96,
  },
  row: {
    paddingVertical: 12,
  },
  footer: {
    margin: 12,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#dc2626',
  },
  footerText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
});
