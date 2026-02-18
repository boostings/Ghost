import React from 'react';
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
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';

interface GlassModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const GlassModal: React.FC<GlassModalProps> = ({
  visible,
  onClose,
  title,
  children,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.overlayTouchable}
            activeOpacity={1}
            onPress={onClose}
          />
          <View style={styles.modalContainer}>
            <View style={styles.cardWrapper}>
              <BlurView intensity={80} tint="dark" style={styles.blur}>
                <View style={styles.cardInner}>
                  {/* Title Bar */}
                  <View style={styles.titleBar}>
                    <Text style={styles.title} numberOfLines={1}>
                      {title}
                    </Text>
                    <TouchableOpacity
                      onPress={onClose}
                      style={styles.closeButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.closeIcon}>✕</Text>
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
                </View>
              </BlurView>
            </View>
          </View>
        </View>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    borderColor: 'rgba(255,255,255,0.15)',
  },
  blur: {
    overflow: 'hidden',
  },
  cardInner: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  titleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.10)',
  },
  title: {
    color: Colors.text,
    fontSize: Fonts.sizes.xl,
    fontWeight: Fonts.bold.fontWeight,
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.bold.fontWeight,
  },
  content: {
    maxHeight: SCREEN_HEIGHT * 0.55,
  },
  contentContainer: {
    padding: 20,
  },
});

export default GlassModal;
