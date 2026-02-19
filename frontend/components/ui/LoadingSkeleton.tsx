import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { Colors } from '../../constants/colors';

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
}

const ShimmerBlock: React.FC<ShimmerBlockProps> = ({
  width,
  height,
  borderRadius = 6,
  style,
  shimmer,
}) => {
  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: Colors.surfaceLight,
          opacity,
        },
        style,
      ]}
    />
  );
};

const QuestionSkeleton: React.FC<{ shimmer: Animated.Value }> = ({ shimmer }) => (
  <View style={styles.card}>
    <View style={styles.row}>
      <ShimmerBlock width={80} height={22} borderRadius={8} shimmer={shimmer} />
      <ShimmerBlock width={60} height={22} borderRadius={8} shimmer={shimmer} />
    </View>
    <ShimmerBlock width="90%" height={20} style={styles.spacerSm} shimmer={shimmer} />
    <ShimmerBlock width="100%" height={14} style={styles.spacerSm} shimmer={shimmer} />
    <ShimmerBlock width="75%" height={14} style={styles.spacerXs} shimmer={shimmer} />
    <ShimmerBlock width="60%" height={14} style={styles.spacerXs} shimmer={shimmer} />
    <View style={[styles.row, styles.spacerMd]}>
      <View style={styles.row}>
        <ShimmerBlock width={32} height={32} borderRadius={16} shimmer={shimmer} />
        <ShimmerBlock width={100} height={14} style={styles.marginLeft} shimmer={shimmer} />
      </View>
      <ShimmerBlock width={60} height={14} shimmer={shimmer} />
    </View>
  </View>
);

const CommentSkeleton: React.FC<{ shimmer: Animated.Value }> = ({ shimmer }) => (
  <View style={styles.card}>
    <View style={styles.row}>
      <ShimmerBlock width={36} height={36} borderRadius={18} shimmer={shimmer} />
      <View style={styles.marginLeft}>
        <ShimmerBlock width={120} height={14} shimmer={shimmer} />
        <ShimmerBlock width={80} height={10} style={styles.spacerXs} shimmer={shimmer} />
      </View>
    </View>
    <ShimmerBlock width="100%" height={14} style={styles.spacerSm} shimmer={shimmer} />
    <ShimmerBlock width="85%" height={14} style={styles.spacerXs} shimmer={shimmer} />
    <View style={[styles.row, styles.spacerSm]}>
      <ShimmerBlock width={50} height={20} shimmer={shimmer} />
    </View>
  </View>
);

const NotificationSkeleton: React.FC<{ shimmer: Animated.Value }> = ({ shimmer }) => (
  <View style={styles.cardCompact}>
    <View style={styles.row}>
      <ShimmerBlock width={40} height={40} borderRadius={20} shimmer={shimmer} />
      <View style={[styles.marginLeft, { flex: 1 }]}>
        <ShimmerBlock width="80%" height={14} shimmer={shimmer} />
        <ShimmerBlock width="60%" height={12} style={styles.spacerXs} shimmer={shimmer} />
      </View>
    </View>
  </View>
);

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ count = 3, type = 'question' }) => {
  const shimmer = useRef(new Animated.Value(0)).current;
  const items = Array.from({ length: count }, (_, i) => i);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1000,
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
        return <QuestionSkeleton shimmer={shimmer} />;
      case 'comment':
        return <CommentSkeleton shimmer={shimmer} />;
      case 'notification':
        return <NotificationSkeleton shimmer={shimmer} />;
      default:
        return <QuestionSkeleton shimmer={shimmer} />;
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
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 16,
    marginBottom: 12,
  },
  cardCompact: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
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
