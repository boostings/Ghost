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
import ScreenHeader from '../../components/ui/ScreenHeader';
import { Colors } from '../../constants/colors';
import { Fonts } from '../../constants/fonts';
import { whiteboardService } from '../../services/whiteboardService';
import { COURSE_CATALOG_TERMS } from '../../services/courseCatalogService';
import { extractErrorMessage } from '../../hooks/useApi';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { sanitizeSingleLine } from '../../utils/sanitize';
import { findMatchingWhiteboard } from '../../utils/whiteboardIdentity';
import { getEmailFieldState, isValidEmail } from '../../utils/validators';

interface FormErrors {
  courseCode?: string;
  courseName?: string;
  semester?: string;
  primaryInstructorEmail?: string;
}

type FacultySetupMode = 'primary' | 'helping';

export default function CreateWhiteboardScreen() {
  const router = useRouter();
  const addWhiteboard = useWhiteboardStore((state) => state.addWhiteboard);
  const whiteboards = useWhiteboardStore((state) => state.whiteboards);

  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [section, setSection] = useState('');
  const [semester, setSemester] = useState<(typeof COURSE_CATALOG_TERMS)[number]>('Fall 2026');
  const [facultySetupMode, setFacultySetupMode] = useState<FacultySetupMode>('primary');
  const [primaryInstructorEmail, setPrimaryInstructorEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    const normalizedCourseCode = sanitizeSingleLine(courseCode).toUpperCase();
    const normalizedCourseName = sanitizeSingleLine(courseName);
    const normalizedSemester = sanitizeSingleLine(semester);
    const normalizedPrimaryInstructorEmail =
      sanitizeSingleLine(primaryInstructorEmail).toLowerCase();

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

    if (facultySetupMode === 'helping') {
      if (!normalizedPrimaryInstructorEmail) {
        nextErrors.primaryInstructorEmail = 'Primary instructor email is required';
      } else if (!isValidEmail(normalizedPrimaryInstructorEmail)) {
        nextErrors.primaryInstructorEmail = 'Enter a valid @ilstu.edu email address';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const { valid: primaryInstructorEmailValid, visibleError: primaryInstructorEmailLiveError } =
    getEmailFieldState({
      value: sanitizeSingleLine(primaryInstructorEmail),
      active: facultySetupMode === 'helping',
    });
  const createDisabled =
    loading || (facultySetupMode === 'helping' && !primaryInstructorEmailValid);

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
      const existingWhiteboard = findMatchingWhiteboard(whiteboards, payload);
      if (existingWhiteboard) {
        Alert.alert(
          'Section Already Exists',
          `${existingWhiteboard.courseCode} section ${existingWhiteboard.section ?? payload.section ?? 'unlisted'} already has a whiteboard for ${existingWhiteboard.semester}.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Class',
              onPress: () => router.replace(`/whiteboard/${existingWhiteboard.id}`),
            },
          ]
        );
        return;
      }

      const createdWhiteboard = await whiteboardService.createWhiteboard(payload);
      addWhiteboard(createdWhiteboard);
      if (facultySetupMode === 'helping') {
        try {
          await whiteboardService.inviteFaculty(
            createdWhiteboard.id,
            sanitizeSingleLine(primaryInstructorEmail).toLowerCase()
          );
        } catch (inviteError: unknown) {
          Alert.alert(
            'Whiteboard Created',
            `The whiteboard was created, but the primary instructor invite failed: ${extractErrorMessage(inviteError)}`
          );
        }
      }
      router.replace(`/whiteboard/${createdWhiteboard.id}`);
    } catch (error: unknown) {
      Alert.alert('Create Failed', extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[Colors.background, Colors.background]} style={styles.gradient}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScreenHeader title="Create Whiteboard" onBack={() => router.back()} />

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
                Whiteboards are shared by course and semester. Section is optional roster context.
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

              <View style={styles.semesterGroup}>
                <Text style={styles.semesterLabel}>Semester</Text>
                <View style={styles.semesterOptions}>
                  {COURSE_CATALOG_TERMS.map((term) => {
                    const selected = semester === term;
                    return (
                      <TouchableOpacity
                        key={term}
                        style={[styles.semesterChip, selected && styles.semesterChipActive]}
                        onPress={() => {
                          setSemester(term);
                          if (errors.semester) {
                            setErrors((prev) => ({ ...prev, semester: undefined }));
                          }
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`Use ${term}`}
                      >
                        <Text
                          style={[
                            styles.semesterChipText,
                            selected && styles.semesterChipTextActive,
                          ]}
                        >
                          {term}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {errors.semester ? <Text style={styles.fieldError}>{errors.semester}</Text> : null}
              </View>

              <View style={styles.setupGroup}>
                <Text style={styles.setupTitle}>Your role in this class</Text>
                <Text style={styles.setupSubtitle}>
                  Choose how Ghost should set up faculty access for this whiteboard.
                </Text>
                <SetupOption
                  title="I'm the primary instructor"
                  subtitle="Create the whiteboard with you as the owner and faculty member."
                  selected={facultySetupMode === 'primary'}
                  onPress={() => setFacultySetupMode('primary')}
                />
                <SetupOption
                  title="I'm helping teach this class"
                  subtitle="Create it for your section and invite the primary instructor as faculty."
                  selected={facultySetupMode === 'helping'}
                  onPress={() => setFacultySetupMode('helping')}
                />
              </View>

              {facultySetupMode === 'helping' ? (
                <GlassInput
                  label="Primary Instructor Email"
                  placeholder="professor@ilstu.edu"
                  value={primaryInstructorEmail}
                  onChangeText={(value) => {
                    setPrimaryInstructorEmail(value);
                    if (errors.primaryInstructorEmail) {
                      setErrors((prev) => ({ ...prev, primaryInstructorEmail: undefined }));
                    }
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  error={errors.primaryInstructorEmail ?? primaryInstructorEmailLiveError}
                />
              ) : null}

              <View style={styles.buttonRow}>
                <GlassButton
                  title="Create Whiteboard"
                  onPress={handleCreate}
                  loading={loading}
                  disabled={createDisabled}
                />
              </View>
            </GlassCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

function SetupOption({
  title,
  subtitle,
  selected,
  onPress,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.setupOption, selected && styles.setupOptionSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <View style={styles.setupOptionText}>
        <Text style={styles.setupOptionTitle}>{title}</Text>
        <Text style={styles.setupOptionSubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
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
  semesterGroup: {
    marginBottom: 16,
  },
  semesterLabel: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
    marginBottom: 8,
  },
  semesterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  semesterChip: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  semesterChipActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(187,39,68,0.22)',
  },
  semesterChipText: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.sm,
    fontWeight: '700',
  },
  semesterChipTextActive: {
    color: Colors.primary,
  },
  fieldError: {
    color: Colors.error,
    fontSize: Fonts.sizes.xs,
    marginTop: 6,
  },
  setupGroup: {
    marginTop: 6,
    marginBottom: 18,
  },
  setupTitle: {
    color: Colors.text,
    fontSize: Fonts.sizes.md,
    fontWeight: '800',
    marginBottom: 4,
  },
  setupSubtitle: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.sm,
    lineHeight: 19,
    marginBottom: 10,
  },
  setupOption: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 10,
  },
  setupOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(187,39,68,0.14)',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  radioSelected: {
    borderColor: Colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  setupOptionText: {
    flex: 1,
  },
  setupOptionTitle: {
    color: Colors.text,
    fontSize: Fonts.sizes.sm,
    fontWeight: '800',
    marginBottom: 4,
  },
  setupOptionSubtitle: {
    color: Colors.textMuted,
    fontSize: Fonts.sizes.xs,
    lineHeight: 17,
  },
  buttonRow: {
    marginTop: 8,
  },
});
