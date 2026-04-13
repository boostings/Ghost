import React, { useEffect } from 'react';
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
} from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useThemeColors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { Duration } from '../../constants/motion';
import { haptic } from '../../utils/haptics';

interface GlassModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const GlassModal: React.FC<GlassModalProps> = ({ visible, onClose, title, children, footer }) => {
  const colors = useThemeColors();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (visible) {
      haptic.soft();
    }
  }, [visible]);

  const handleClose = () => {
    haptic.light();
    onClose();
  };

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
          style={[styles.overlay, { backgroundColor: colors.overlay }]}
        >
          <TouchableOpacity
            style={styles.overlayTouchable}
            activeOpacity={1}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close modal"
          />
          <Animated.View
            entering={ZoomIn.duration(Duration.slow).springify().damping(20)}
            style={styles.modalContainer}
          >
            <View style={[styles.cardWrapper, { borderColor: colors.cardBorder }]}>
              <BlurView
                intensity={80}
                tint={colorScheme === 'dark' ? 'dark' : 'light'}
                style={styles.blur}
              >
                <View style={[styles.cardInner, { backgroundColor: colors.cardBg }]}>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: '90%',
    maxHeight: SCREEN_HEIGHT * 0.75,
  },
  cardWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  blur: {
    overflow: 'hidden',
  },
  cardInner: {},
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
