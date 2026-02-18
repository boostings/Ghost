import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, Dimensions } from 'react-native';
import { Colors } from '../../constants/colors';

type SkeletonType = 'question' | 'comment' | 'notification';

interface LoadingSkeletonProps {
  count?: number;
  type?: SkeletonType;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ShimmerBlock: React.FC<{
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
}> = ({ width, height, borderRadius = 6, style }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
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

const QuestionSkeleton: React.FC = () => (
  <View style={styles.card}>
    {/* Top row: badge + status */}
    <View style={styles.row}>
      <ShimmerBlock width={80} height={22} borderRadius={8} />
      <ShimmerBlock width={60} height={22} borderRadius={8} />
    </View>
    {/* Title */}
    <ShimmerBlock width="90%" height={20} style={styles.spacerSm} />
    {/* Body lines */}
    <ShimmerBlock width="100%" height={14} style={styles.spacerSm} />
    <ShimmerBlock width="75%" height={14} style={styles.spacerXs} />
    <ShimmerBlock width="60%" height={14} style={styles.spacerXs} />
    {/* Bottom row */}
    <View style={[styles.row, styles.spacerMd]}>
      <View style={styles.row}>
        <ShimmerBlock width={32} height={32} borderRadius={16} />
        <ShimmerBlock width={100} height={14} style={styles.marginLeft} />
      </View>
      <ShimmerBlock width={60} height={14} />
    </View>
  </View>
);

const CommentSkeleton: React.FC = () => (
  <View style={styles.card}>
    {/* Avatar + name + time */}
    <View style={styles.row}>
      <ShimmerBlock width={36} height={36} borderRadius={18} />
      <View style={styles.marginLeft}>
        <ShimmerBlock width={120} height={14} />
        <ShimmerBlock width={80} height={10} style={styles.spacerXs} />
      </View>
    </View>
    {/* Body */}
    <ShimmerBlock width="100%" height={14} style={styles.spacerSm} />
    <ShimmerBlock width="85%" height={14} style={styles.spacerXs} />
    {/* Bottom row */}
    <View style={[styles.row, styles.spacerSm]}>
      <ShimmerBlock width={50} height={20} />
    </View>
  </View>
);

const NotificationSkeleton: React.FC = () => (
  <View style={styles.cardCompact}>
    <View style={styles.row}>
      <ShimmerBlock width={40} height={40} borderRadius={20} />
      <View style={[styles.marginLeft, { flex: 1 }]}>
        <ShimmerBlock width="80%" height={14} />
        <ShimmerBlock width="60%" height={12} style={styles.spacerXs} />
      </View>
    </View>
  </View>
);

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  count = 3,
  type = 'question',
}) => {
  const items = Array.from({ length: count }, (_, i) => i);

  const renderSkeleton = () => {
    switch (type) {
      case 'question':
        return <QuestionSkeleton />;
      case 'comment':
        return <CommentSkeleton />;
      case 'notification':
        return <NotificationSkeleton />;
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
