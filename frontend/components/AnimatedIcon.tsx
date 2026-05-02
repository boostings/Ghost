import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  type AccessibilityRole,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useReducedMotion } from '../hooks/useReducedMotion';

type IconMotion = 'pop' | 'tilt' | 'spin' | 'drop' | 'rise' | 'bounce' | 'fade' | 'none';

type BaseProps = {
  color: string;
  size: number;
  motion?: IconMotion;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
};

type IonProps = BaseProps & {
  family?: 'ionicons';
  name: keyof typeof Ionicons.glyphMap;
};

type FA5Props = BaseProps & {
  family: 'fa5';
  name: string;
  brand?: boolean;
  solid?: boolean;
};

type AnimatedIconProps = IonProps | FA5Props;

export function AnimatedIcon(props: AnimatedIconProps) {
  const motion: IconMotion = props.motion ?? 'pop';
  const progress = useRef(new Animated.Value(motion === 'none' ? 1 : 0)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (motion === 'none') return;
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const anim = buildAnimation(motion, progress);
    anim.start();
    return () => anim.stop();
  }, [motion, progress, reducedMotion]);

  const { transform, opacity } = motionOutputs(motion, progress);
  const animatedStyle = opacity !== undefined ? { opacity, transform } : { transform };

  return (
    <Animated.View
      accessible={Boolean(props.accessibilityLabel)}
      accessibilityLabel={props.accessibilityLabel}
      accessibilityRole={props.accessibilityRole}
      importantForAccessibility={props.accessibilityLabel ? 'auto' : 'no'}
      style={[animatedStyle, props.style]}
    >
      {renderIcon(props)}
    </Animated.View>
  );
}

function renderIcon(props: AnimatedIconProps) {
  if (props.family === 'fa5') {
    return (
      <FontAwesome5
        name={props.name}
        size={props.size}
        color={props.color}
        accessible={false}
        importantForAccessibility="no"
        {...(props.brand ? { brand: true } : {})}
        {...(props.solid ? { solid: true } : {})}
      />
    );
  }
  return (
    <Ionicons
      name={props.name}
      size={props.size}
      color={props.color}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}

function buildAnimation(motion: IconMotion, progress: Animated.Value): Animated.CompositeAnimation {
  switch (motion) {
    case 'tilt':
      return Animated.timing(progress, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
    case 'fade':
      return Animated.timing(progress, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
    case 'drop':
    case 'rise':
      return Animated.timing(progress, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
    case 'spin':
      return Animated.spring(progress, {
        toValue: 1,
        damping: 14,
        stiffness: 220,
        mass: 0.7,
        useNativeDriver: true,
      });
    case 'bounce':
      return Animated.spring(progress, {
        toValue: 1,
        damping: 9,
        stiffness: 260,
        mass: 0.6,
        useNativeDriver: true,
      });
    case 'pop':
    default:
      return Animated.spring(progress, {
        toValue: 1,
        damping: 16,
        stiffness: 260,
        mass: 0.7,
        useNativeDriver: true,
      });
  }
}

function motionOutputs(motion: IconMotion, progress: Animated.Value) {
  switch (motion) {
    case 'pop': {
      const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] });
      const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
      return { transform: [{ scale }], opacity };
    }
    case 'bounce': {
      const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });
      const opacity = progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1] });
      return { transform: [{ scale }], opacity };
    }
    case 'spin': {
      const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['-60deg', '0deg'] });
      const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });
      return { transform: [{ rotate }, { scale }], opacity: undefined };
    }
    case 'tilt': {
      const rotate = progress.interpolate({
        inputRange: [0, 0.35, 0.65, 1],
        outputRange: ['-20deg', '14deg', '-7deg', '0deg'],
      });
      return { transform: [{ rotate }], opacity: undefined };
    }
    case 'drop': {
      const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] });
      const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
      return { transform: [{ translateY }], opacity };
    }
    case 'rise': {
      const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] });
      const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
      return { transform: [{ translateY }], opacity };
    }
    case 'fade': {
      const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
      return { transform: [], opacity };
    }
    case 'none':
    default:
      return { transform: [], opacity: undefined };
  }
}
