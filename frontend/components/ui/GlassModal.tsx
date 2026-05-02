import React, { useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  useColorScheme,
  PanResponder,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Duration, Ease } from '../../constants/motion';
import { haptic } from '../../utils/haptics';

interface GlassModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  presentation?: 'sheet' | 'dialog';
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const GlassModal: React.FC<GlassModalProps> = ({
  visible,
  onClose,
  title,
  children,
  footer,
  presentation = 'sheet',
}) => {
  const colors = useThemeColors();
  const colorScheme = useColorScheme();
  const isSheet = presentation === 'sheet';
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      haptic.soft();
      translateY.value = 0;
    }
  }, [translateY, visible]);

  const handleClose = useCallback(() => {
    haptic.light();
    onClose();
  }, [onClose]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => isSheet,
        onMoveShouldSetPanResponder: (_event, gesture) => isSheet && gesture.dy > 8,
        onPanResponderMove: (_event, gesture) => {
          translateY.value = Math.max(0, gesture.dy);
        },
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dy > 80 || gesture.vy > 0.9) {
            handleClose();
            return;
          }
          translateY.value = withSpring(0, { damping: 22, stiffness: 240 });
        },
        onPanResponderTerminate: () => {
          translateY.value = withSpring(0, { damping: 22, stiffness: 240 });
        },
      }),
    [handleClose, isSheet, translateY]
  );

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: isSheet ? translateY.value : 0 }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Animated.View
          entering={FadeIn.duration(Duration.normal)}
          exiting={FadeOut.duration(Duration.fast)}
          style={[
            styles.overlay,
            isSheet ? styles.sheetOverlay : styles.dialogOverlay,
            { backgroundColor: 'rgba(0, 0, 0, 0.6)' },
          ]}
        >
          <TouchableOpacity
            style={styles.overlayTouchable}
            activeOpacity={1}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close modal"
          />
          <Animated.View
            entering={FadeIn.duration(Duration.normal).easing(Ease.out)}
            exiting={FadeOut.duration(Duration.fast)}
            style={[
              isSheet ? styles.sheetContainer : styles.dialogContainer,
              isSheet && sheetAnimatedStyle,
            ]}
            {...(isSheet ? panResponder.panHandlers : {})}
          >
            <View
              style={[
                styles.cardWrapper,
                isSheet ? styles.sheetCardWrapper : styles.dialogCardWrapper,
                { borderColor: colors.cardBorder },
              ]}
            >
              <BlurView
                intensity={80}
                tint={colorScheme === 'dark' ? 'dark' : 'light'}
                style={styles.blur}
              >
                <View style={[styles.cardInner, { backgroundColor: colors.cardBg }]}>
                  {isSheet ? (
                    <View style={styles.handleWrap} accessible={false}>
                      <View style={[styles.handle, { backgroundColor: colors.surfaceBorder }]} />
                    </View>
                  ) : null}
                  {/* Title Bar */}
                  <View style={[styles.titleBar, { borderBottomColor: colors.surfaceBorder }]}>
                    <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                      {title}
                    </Text>
                    <TouchableOpacity
                      onPress={handleClose}
                      style={[styles.closeButton, { backgroundColor: colors.surfaceLight }]}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityRole="button"
                      accessibilityLabel="Close modal"
                    >
                      <Text style={[styles.closeIcon, { color: colors.textSecondary }]}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Content */}
                  <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                  >
                    {children}
                  </ScrollView>

                  {footer ? (
                    <View style={[styles.footer, { borderTopColor: colors.surfaceBorder }]}>
                      {footer}
                    </View>
                  ) : null}
                </View>
              </BlurView>
            </View>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
  },
  sheetOverlay: {
    justifyContent: 'flex-end',
  },
  dialogOverlay: {
    justifyContent: 'center',
  },
  overlayTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.82,
  },
  dialogContainer: {
    width: '90%',
    maxHeight: SCREEN_HEIGHT * 0.75,
  },
  cardWrapper: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  sheetCardWrapper: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  dialogCardWrapper: {
    borderRadius: 20,
  },
  blur: {
    overflow: 'hidden',
  },
  cardInner: {},
  handleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 2,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.bold.fontWeight,
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.bold.fontWeight,
  },
  content: {
    maxHeight: SCREEN_HEIGHT * 0.55,
  },
  contentContainer: {
    padding: 20,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
});

export default GlassModal;
