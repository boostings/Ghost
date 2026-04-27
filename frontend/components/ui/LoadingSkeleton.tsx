import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { useThemeColors, type AppColors } from '../../constants/colors';
import { Radius } from '../../constants/spacing';

type SkeletonType = 'question' | 'comment' | 'notification';

interface LoadingSkeletonProps {
  count?: number;
  type?: SkeletonType;
}

interface ShimmerBlockProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
  shimmer: Animated.Value;
  colors: AppColors;
}

const ShimmerBlock: React.FC<ShimmerBlockProps> = ({
  width,
  height,
  borderRadius = 6,
  style,
  shimmer,
  colors,
}) => {
  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.55],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: colors.surfaceLight,
          opacity,
        },
        style,
      ]}
    />
  );
};

const QuestionSkeleton: React.FC<{ shimmer: Animated.Value; colors: AppColors }> = ({
  shimmer,
  colors,
}) => (
  <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
    <View style={styles.row}>
      <ShimmerBlock width={80} height={22} borderRadius={8} shimmer={shimmer} colors={colors} />
      <ShimmerBlock width={60} height={22} borderRadius={8} shimmer={shimmer} colors={colors} />
    </View>
    <ShimmerBlock
      width="90%"
      height={20}
      style={styles.spacerSm}
      shimmer={shimmer}
      colors={colors}
    />
    <ShimmerBlock
      width="100%"
      height={14}
      style={styles.spacerSm}
      shimmer={shimmer}
      colors={colors}
    />
    <ShimmerBlock
      width="75%"
      height={14}
      style={styles.spacerXs}
      shimmer={shimmer}
      colors={colors}
    />
    <ShimmerBlock
      width="60%"
      height={14}
      style={styles.spacerXs}
      shimmer={shimmer}
      colors={colors}
    />
    <View style={[styles.row, styles.spacerMd]}>
      <View style={styles.row}>
        <ShimmerBlock width={32} height={32} borderRadius={16} shimmer={shimmer} colors={colors} />
        <ShimmerBlock
          width={100}
          height={14}
          style={styles.marginLeft}
          shimmer={shimmer}
          colors={colors}
        />
      </View>
      <ShimmerBlock width={60} height={14} shimmer={shimmer} colors={colors} />
    </View>
  </View>
);

const CommentSkeleton: React.FC<{ shimmer: Animated.Value; colors: AppColors }> = ({
  shimmer,
  colors,
}) => (
  <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
    <View style={styles.row}>
      <ShimmerBlock width={36} height={36} borderRadius={18} shimmer={shimmer} colors={colors} />
      <View style={styles.marginLeft}>
        <ShimmerBlock width={120} height={14} shimmer={shimmer} colors={colors} />
        <ShimmerBlock
          width={80}
          height={10}
          style={styles.spacerXs}
          shimmer={shimmer}
          colors={colors}
        />
      </View>
    </View>
    <ShimmerBlock
      width="100%"
      height={14}
      style={styles.spacerSm}
      shimmer={shimmer}
      colors={colors}
    />
    <ShimmerBlock
      width="85%"
      height={14}
      style={styles.spacerXs}
      shimmer={shimmer}
      colors={colors}
    />
    <View style={[styles.row, styles.spacerSm]}>
      <ShimmerBlock width={50} height={20} shimmer={shimmer} colors={colors} />
    </View>
  </View>
);

const NotificationSkeleton: React.FC<{ shimmer: Animated.Value; colors: AppColors }> = ({
  shimmer,
  colors,
}) => (
  <View
    style={[styles.cardCompact, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
  >
    <View style={styles.row}>
      <ShimmerBlock width={40} height={40} borderRadius={20} shimmer={shimmer} colors={colors} />
      <View style={[styles.marginLeft, { flex: 1 }]}>
        <ShimmerBlock width="80%" height={14} shimmer={shimmer} colors={colors} />
        <ShimmerBlock
          width="60%"
          height={12}
          style={styles.spacerXs}
          shimmer={shimmer}
          colors={colors}
        />
      </View>
    </View>
  </View>
);

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ count = 3, type = 'question' }) => {
  const colors = useThemeColors();
  const shimmer = useRef(new Animated.Value(0)).current;
  const items = Array.from({ length: count }, (_, i) => i);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1100,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  const renderSkeleton = () => {
    switch (type) {
      case 'question':
        return <QuestionSkeleton shimmer={shimmer} colors={colors} />;
      case 'comment':
        return <CommentSkeleton shimmer={shimmer} colors={colors} />;
      case 'notification':
        return <NotificationSkeleton shimmer={shimmer} colors={colors} />;
      default:
        return <QuestionSkeleton shimmer={shimmer} colors={colors} />;
    }
  };

  return (
    <View style={styles.container}>
      {items.map((key) => (
        <View key={key}>{renderSkeleton()}</View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 12,
  },
  cardCompact: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spacerXs: {
    marginTop: 6,
  },
  spacerSm: {
    marginTop: 12,
  },
  spacerMd: {
    marginTop: 16,
  },
  marginLeft: {
    marginLeft: 10,
  },
});

export default LoadingSkeleton;
