# BottomSheetModal keeps the old `topInset` after rotation

Minimal reproduction for `@gorhom/bottom-sheet` 5.2.14: when a device rotates while a
`BottomSheetModal` with `topInset` is open, the sheet's `containerHeight` keeps the inset
from the previous orientation. The footer ends up off-screen (landscape → portrait) or
floating above the bottom edge (portrait → landscape).

## Video

[`media/rotation-bug.mp4`](media/rotation-bug.mp4) (iPhone 17 Pro simulator, stock 5.2.14):

1. Rotate to landscape and open the sheet.
2. Rotate to portrait: `containerHeight 874` instead of 812, footer cut off at the bottom edge.
3. Close and reopen in portrait: `containerHeight 812`, footer visible.
4. Rotate to landscape: `containerHeight 340` instead of 402, footer floats above the bottom.

## Versions

| Package | Version |
| -- | -- |
| expo | 58.0.23 |
| react-native | 0.88.1 (New Architecture) |
| @gorhom/bottom-sheet | 5.2.14 |
| react-native-reanimated | 4.7.1 |
| react-native-worklets | 0.13.0 |
| react-native-gesture-handler | 3.3.0 |
| react-native-safe-area-context | 5.11.1 |

## Run

```sh
npm install
npx expo start
```

Open it in Expo Go on an iPhone with a notch or Dynamic Island (reproduced on an iPhone 17 Pro
simulator, iOS 26.4). Rotation lock must be off.

## Steps

The sheet shows `useBottomSheetInternal()` values so the wrong height is visible.

1. Rotate to landscape (`insets.top` is 0).
2. Tap **Open sheet**.
3. Rotate to portrait (`insets.top` becomes 62).

Expected: `containerHeight 812` (874 − 62), red footer fully visible.
Actual: `containerHeight 874`, red footer pushed below the screen edge.

The reverse also fails: open in portrait, rotate to landscape. Expected `containerHeight 402`,
actual `340` (the portrait inset is still subtracted), so the footer floats 62pt high.

Closing and reopening the sheet in the new orientation always gives the right height.

## Cause

`useAnimatedLayout` subtracts `topInset + bottomInset` inside the `react` callback of two
`useAnimatedReaction`s, but the `prepare` callbacks only return the raw container height:

```ts
useAnimatedReaction(
  () => containerLayoutState?.get().height,
  (result, previous) => {
    if (!result || result === previous) {
      return;
    }
    // ...
    _state.containerHeight = modal ? result - verticalInset : result;
  },
  [state, verticalInset, modal]
);
```

On rotation the window height and the safe-area inset arrive in separate updates. When
`verticalInset` changes, the reaction restarts with the new closure, but the container height it
returns is the same as `previous` (Reanimated keeps `previous` across restarts), so it returns
early and the new inset is never applied. The dependency array does not help: Reanimated ignores
it on native.

## Fix

Return the inset-adjusted height from `prepare`, so a change to the inset alone is a new value:

```diff
 useAnimatedReaction(
-  () => containerLayoutState?.get().height,
-  (result, previous) => {
-    if (!result || result === previous) {
+  () => {
+    const height = containerLayoutState?.get().height;
+    if (!height || height === INITIAL_LAYOUT_VALUE) {
+      return INITIAL_LAYOUT_VALUE;
+    }
+    return modal ? height - verticalInset : height;
+  },
+  (result, previous) => {
+    if (result === previous) {
       return;
     }
     if (result === INITIAL_LAYOUT_VALUE) {
       return;
     }
     state.modify(_state => {
       'worklet';
-      _state.containerHeight = modal ? result - verticalInset : result;
+      _state.containerHeight = result;
       return _state;
     });
   },
```

The same change applies to the `rawContainerHeight` reaction above it. With this change applied to
`node_modules`, both directions give the expected heights in this app.
