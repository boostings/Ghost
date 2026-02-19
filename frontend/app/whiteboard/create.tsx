import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import GlassButton from '../../components/ui/GlassButton';
import GlassCard from '../../components/ui/GlassCard';
import GlassInput from '../../components/ui/GlassInput';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { whiteboardService } from '../../services/whiteboardService';
import { extractErrorMessage } from '../../hooks/useApi';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { sanitizeSingleLine } from '../../utils/sanitize';

interface FormErrors {
  courseCode?: string;
  courseName?: string;
  semester?: string;
}

export default function CreateWhiteboardScreen() {
  const router = useRouter();
  const addWhiteboard = useWhiteboardStore((state) => state.addWhiteboard);

  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [section, setSection] = useState('');
  const [semester, setSemester] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    const normalizedCourseCode = sanitizeSingleLine(courseCode).toUpperCase();
    const normalizedCourseName = sanitizeSingleLine(courseName);
    const normalizedSemester = sanitizeSingleLine(semester);

    if (!normalizedCourseCode) {
      nextErrors.courseCode = 'Course code is required';
    } else if (!/^[A-Z0-9-]{2,20}$/.test(normalizedCourseCode)) {
      nextErrors.courseCode = 'Use letters, numbers, and hyphens only';
    }

    if (!normalizedCourseName) {
      nextErrors.courseName = 'Course name is required';
    } else if (normalizedCourseName.length > 150) {
      nextErrors.courseName = 'Course name is too long';
    }

    if (!normalizedSemester) {
      nextErrors.semester = 'Semester is required';
    } else if (normalizedSemester.length > 40) {
      nextErrors.semester = 'Semester is too long';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const payload = {
        courseCode: sanitizeSingleLine(courseCode).toUpperCase(),
        courseName: sanitizeSingleLine(courseName),
        section: sanitizeSingleLine(section)
          ? sanitizeSingleLine(section).toUpperCase()
          : undefined,
        semester: sanitizeSingleLine(semester),
      };
      const createdWhiteboard = await whiteboardService.createWhiteboard(payload);
      addWhiteboard(createdWhiteboard);
      router.replace(`/whiteboard/${createdWhiteboard.id}`);
    } catch (error: unknown) {
      Alert.alert('Create Failed', extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#1A1A2E', '#16213E', '#0F3460']} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backArrow}>{'\u2190'}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Whiteboard</Text>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboard}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <GlassCard>
              <Text style={styles.formTitle}>Class Details</Text>
              <Text style={styles.formSubtitle}>
                A whiteboard is shared by all sections with the same course code and semester.
              </Text>

              <GlassInput
                label="Course Code"
                placeholder="IT326"
                value={courseCode}
                onChangeText={(value) => {
                  setCourseCode(value);
                  if (errors.courseCode) {
                    setErrors((prev) => ({ ...prev, courseCode: undefined }));
                  }
                }}
                autoCapitalize="characters"
                error={errors.courseCode}
              />

              <GlassInput
                label="Course Name"
                placeholder="Data Structures"
                value={courseName}
                onChangeText={(value) => {
                  setCourseName(value);
                  if (errors.courseName) {
                    setErrors((prev) => ({ ...prev, courseName: undefined }));
                  }
                }}
                error={errors.courseName}
              />

              <GlassInput
                label="Section (Optional)"
                placeholder="001"
                value={section}
                onChangeText={setSection}
                autoCapitalize="characters"
              />

              <GlassInput
                label="Semester"
                placeholder="Fall 2026"
                value={semester}
                onChangeText={(value) => {
                  setSemester(value);
                  if (errors.semester) {
                    setErrors((prev) => ({ ...prev, semester: undefined }));
                  }
                }}
                error={errors.semester}
              />

              <View style={styles.buttonRow}>
                <GlassButton
                  title="Create Whiteboard"
                  onPress={handleCreate}
                  loading={loading}
                  disabled={loading}
                />
              </View>
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: Colors.text,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: Colors.text,
    fontSize: Fonts.sizes.xl,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 44,
  },
  keyboard: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  formTitle: {
    color: Colors.text,
    fontSize: Fonts.sizes.xl,
    fontWeight: '700',
    marginBottom: 6,
  },
  formSubtitle: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.sm,
    marginBottom: 18,
    lineHeight: 18,
  },
  buttonRow: {
    marginTop: 8,
  },
});
