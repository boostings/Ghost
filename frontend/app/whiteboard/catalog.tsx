import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import GlassButton from '../../components/ui/GlassButton';
import { Colors } from '../../constants/colors';
import { Duration, PRESSED_SCALE, Spring } from '../../constants/motion';
import { haptic } from '../../utils/haptics';
import {
  COURSE_CATALOG_TERMS,
  type CourseCatalogSortBy,
  type CourseCatalogSortDirection,
  courseCatalogService,
} from '../../services/courseCatalogService';
import { whiteboardService } from '../../services/whiteboardService';
import { useWhiteboardStore } from '../../stores/whiteboardStore';
import { sanitizeSingleLine } from '../../utils/sanitize';
import { findMatchingWhiteboard } from '../../utils/whiteboardIdentity';
import type { CourseSectionResponse } from '../../types';

const PAGE_SIZE = 30;
const DEBOUNCE_MS = 280;

const IOS_EASE = Easing.bezier(0.32, 0.72, 0, 1);
const OUT_EASE = Easing.bezier(0.16, 1, 0.3, 1);

type SortOption = { key: CourseCatalogSortBy; label: string };

const PRIMARY_SORTS: SortOption[] = [
  { key: 'courseCode', label: 'Course code' },
  { key: 'courseName', label: 'Title' },
  { key: 'teacher', label: 'Instructor' },
  { key: 'classNumber', label: 'Class number' },
  { key: 'section', label: 'Section' },
  { key: 'credit', label: 'Credits' },
  { key: 'openSection', label: 'Open seats first' },
];

const SECONDARY_SORTS: SortOption[] = [
  { key: 'subject', label: 'Subject' },
  { key: 'catalogNumber', label: 'Catalog #' },
  { key: 'instructionMode', label: 'Mode' },
  { key: 'session', label: 'Session' },
  { key: 'meetingTimes', label: 'Meeting time' },
  { key: 'weeks', label: 'Weeks' },
  { key: 'lowCostMaterials', label: 'Low-cost materials' },
  { key: 'noCostMaterials', label: 'No-cost materials' },
  { key: 'department', label: 'Department' },
  { key: 'semester', label: 'Semester' },
];

const SORT_LABELS: Record<CourseCatalogSortBy, string> = Object.fromEntries(
  [...PRIMARY_SORTS, ...SECONDARY_SORTS].map((opt) => [opt.key, opt.label])
) as Record<CourseCatalogSortBy, string>;

const BOOLEAN_FIRST_SORTS = new Set<CourseCatalogSortBy>([
  'openSection',
  'lowCostMaterials',
  'noCostMaterials',
]);

function getDefaultSortDirection(sortKey: CourseCatalogSortBy): CourseCatalogSortDirection {
  return BOOLEAN_FIRST_SORTS.has(sortKey) ? 'DESC' : 'ASC';
}

export default function CourseCatalogScreen() {
  const router = useRouter();
  const addWhiteboard = useWhiteboardStore((state) => state.addWhiteboard);
  const whiteboards = useWhiteboardStore((state) => state.whiteboards);
  const reduceMotion = useReducedMotion();

  const [search, setSearch] = useState('');
  const [semester, setSemester] = useState<(typeof COURSE_CATALOG_TERMS)[number]>('Fall 2026');
  const [subjectInput, setSubjectInput] = useState('');
  const [sortBy, setSortBy] = useState<CourseCatalogSortBy>('courseCode');
  const [sortDirection, setSortDirection] = useState<CourseCatalogSortDirection>('ASC');
  const [sections, setSections] = useState<CourseSectionResponse[]>([]);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [creatingSectionId, setCreatingSectionId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sortSheetOpen, setSortSheetOpen] = useState(false);

  const requestSequenceRef = useRef(0);
  const stateRef = useRef({ hasMore, loadingMore, loading, page });
  stateRef.current = { hasMore, loadingMore, loading, page };

  const searchQuery = useMemo(() => sanitizeSingleLine(search), [search]);
  const subjectFilter = useMemo(() => {
    const normalized = sanitizeSingleLine(subjectInput).toUpperCase();
    return normalized || undefined;
  }, [subjectInput]);

  // Stable fetch — depends only on filter inputs, never on result/data state.
  // This prevents the debounce effect below from re-firing every time we
  // call setHasMore / setLoadingMore mid-request.
  const fetchSections = useCallback(
    async (mode: 'replace' | 'append', requestedPage: number) => {
      const sequence = ++requestSequenceRef.current;
      if (mode === 'replace') {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      try {
        const response = await courseCatalogService.getSections({
          semester,
          query: searchQuery,
          subject: subjectFilter,
          sortBy,
          sortDirection,
          page: requestedPage,
          size: PAGE_SIZE,
        });
        if (sequence !== requestSequenceRef.current) return;
        setSections((current) =>
          mode === 'replace' ? response.content : [...current, ...response.content]
        );
        setPage(requestedPage);
        setHasMore(requestedPage + 1 < response.totalPages);
        setTotalElements(response.totalElements);
        setLoadError(null);
      } catch {
        if (sequence !== requestSequenceRef.current) return;
        if (mode === 'replace') setSections([]);
        setHasMore(false);
        setTotalElements(0);
        setLoadError('Unable to load classes from the catalog.');
      } finally {
        if (sequence !== requestSequenceRef.current) return;
        if (mode === 'replace') setLoading(false);
        else setLoadingMore(false);
      }
    },
    [searchQuery, subjectFilter, semester, sortBy, sortDirection]
  );

  useEffect(() => {
    const id = setTimeout(() => {
      void fetchSections('replace', 0);
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [fetchSections]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSections('replace', 0);
    setRefreshing(false);
  }, [fetchSections]);

  const handleLoadMore = useCallback(() => {
    const { hasMore: hm, loadingMore: lm, loading: ld, page: p } = stateRef.current;
    if (!hm || lm || ld) return;
    void fetchSections('append', p + 1);
  }, [fetchSections]);

  const createWhiteboardFromSection = useCallback(
    async (section: CourseSectionResponse) => {
      const existingWhiteboard = findMatchingWhiteboard(whiteboards, {
        courseCode: section.courseCode,
        semester: section.semester,
      });
      if (existingWhiteboard) {
        Alert.alert(
          'Class Already Exists',
          `${existingWhiteboard.courseCode} already has a whiteboard for ${existingWhiteboard.semester}.`,
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

      setCreatingSectionId(section.id);
      try {
        const created = await whiteboardService.createWhiteboard({
          courseCode: section.courseCode,
          courseName: section.courseName,
          section: section.section,
          semester: section.semester,
        });
        addWhiteboard(created);
        router.replace(`/whiteboard/${created.id}`);
      } catch {
        Alert.alert('Create failed', 'Unable to create a whiteboard for this class.');
      } finally {
        setCreatingSectionId(null);
      }
    },
    [addWhiteboard, router, whiteboards]
  );

  const handleSortChoice = useCallback(
    (key: CourseCatalogSortBy) => {
      haptic.selection();
      if (sortBy === key) {
        setSortDirection((d) => (d === 'ASC' ? 'DESC' : 'ASC'));
      } else {
        setSortBy(key);
        setSortDirection(getDefaultSortDirection(key));
      }
    },
    [sortBy]
  );

  const renderSection = useCallback(
    ({ item, index }: { item: CourseSectionResponse; index: number }) => (
      <SectionCard
        section={item}
        index={index}
        creating={creatingSectionId === item.id}
        disabled={creatingSectionId !== null && creatingSectionId !== item.id}
        onPress={() => createWhiteboardFromSection(item)}
        reduceMotion={reduceMotion}
      />
    ),
    [createWhiteboardFromSection, creatingSectionId, reduceMotion]
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1a0710', Colors.background, Colors.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>ILSTU CATALOG</Text>
            <Text style={styles.headerTitle}>Find your class</Text>
          </View>
        </View>

        <View style={styles.filters}>
          <SearchField value={search} onChangeText={setSearch} />
          <TermSegmented
            value={semester}
            onChange={(t) => {
              haptic.selection();
              setSemester(t);
            }}
            reduceMotion={reduceMotion}
          />
          <View style={styles.filterRow}>
            <SubjectField value={subjectInput} onChangeText={setSubjectInput} />
            <SortPill
              label={SORT_LABELS[sortBy]}
              direction={sortDirection}
              onPress={() => {
                haptic.light();
                setSortSheetOpen(true);
              }}
            />
          </View>
          <ResultLine
            count={totalElements}
            loading={loading}
            error={loadError}
            semester={semester}
          />
        </View>

        <FlatList
          data={sections}
          renderItem={renderSection}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>
                  {loadError ?? 'No classes match those filters.'}
                </Text>
                <Text style={styles.emptyHint}>
                  Try a different term, drop the subject filter, or clear search.
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={Colors.primary} />
              </View>
            ) : null
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
        />

        <View style={styles.bottomBar}>
          <GlassButton
            title="Add manually"
            onPress={() => router.push('/whiteboard/create')}
            variant="secondary"
          />
        </View>
      </SafeAreaView>

      <SortSheet
        visible={sortSheetOpen}
        onClose={() => setSortSheetOpen(false)}
        sortBy={sortBy}
        direction={sortDirection}
        onChoose={handleSortChoice}
        onToggleDirection={() => {
          haptic.selection();
          setSortDirection((d) => (d === 'ASC' ? 'DESC' : 'ASC'));
        }}
      />
    </View>
  );
}

// ---------- Search field ----------

interface SearchFieldProps {
  value: string;
  onChangeText: (v: string) => void;
}

function SearchField({ value, onChangeText }: SearchFieldProps) {
  const focus = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: focus.value > 0.5 ? Colors.primary : 'rgba(255,255,255,0.14)',
    transform: [{ scale: 0.998 + focus.value * 0.002 }],
  }));
  return (
    <Animated.View style={[styles.searchField, animatedStyle]}>
      <Ionicons name="search" size={18} color={Colors.textMuted} style={styles.searchIcon} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search course, title, instructor, or class #"
        placeholderTextColor={Colors.textMuted}
        style={styles.searchInput}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        onFocus={() => {
          focus.value = withTiming(1, { duration: Duration.normal, easing: OUT_EASE });
        }}
        onBlur={() => {
          focus.value = withTiming(0, { duration: Duration.normal, easing: OUT_EASE });
        }}
        selectionColor={Colors.primary}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={10}
          style={styles.clearButton}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

// ---------- Subject text field ----------

function SubjectField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <View style={styles.subjectField}>
      <Text style={styles.subjectPrefix}>SUBJ</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="ANY"
        placeholderTextColor={Colors.textMuted}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={6}
        style={styles.subjectInput}
        selectionColor={Colors.primary}
      />
    </View>
  );
}

// ---------- Term segmented ----------

interface TermSegmentedProps {
  value: (typeof COURSE_CATALOG_TERMS)[number];
  onChange: (t: (typeof COURSE_CATALOG_TERMS)[number]) => void;
  reduceMotion: boolean;
}

function TermSegmented({ value, onChange, reduceMotion }: TermSegmentedProps) {
  const [width, setWidth] = useState(0);
  const indicatorIndex = useSharedValue(COURSE_CATALOG_TERMS.indexOf(value));
  useEffect(() => {
    const idx = COURSE_CATALOG_TERMS.indexOf(value);
    if (reduceMotion) {
      indicatorIndex.value = idx;
    } else {
      indicatorIndex.value = withTiming(idx, { duration: Duration.normal, easing: IOS_EASE });
    }
  }, [value, reduceMotion, indicatorIndex]);

  const segmentWidth = width > 0 ? (width - 8) / COURSE_CATALOG_TERMS.length : 0;
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorIndex.value * segmentWidth }],
    width: segmentWidth,
  }));

  return (
    <View
      style={styles.segmented}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 ? <Animated.View style={[styles.segmentedIndicator, indicatorStyle]} /> : null}
      {COURSE_CATALOG_TERMS.map((term) => {
        const active = value === term;
        return (
          <Pressable
            key={term}
            onPress={() => onChange(term)}
            style={styles.segmentedItem}
            accessibilityRole="button"
            accessibilityLabel={`Show ${term} classes`}
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.segmentedText, active && styles.segmentedTextActive]}>
              {term}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- Sort pill ----------

function SortPill({
  label,
  direction,
  onPress,
}: {
  label: string;
  direction: CourseCatalogSortDirection;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.sortPillWrapper, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(PRESSED_SCALE, Spring.press);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, Spring.press);
        }}
        style={styles.sortPill}
        accessibilityRole="button"
        accessibilityLabel={`Sort by ${label}, ${direction === 'ASC' ? 'ascending' : 'descending'}`}
      >
        <Ionicons
          name={direction === 'ASC' ? 'arrow-up' : 'arrow-down'}
          size={14}
          color={Colors.text}
        />
        <Text style={styles.sortPillLabel} numberOfLines={1}>
          {label}
        </Text>
        <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

// ---------- Result line ----------

function ResultLine({
  count,
  loading,
  error,
  semester,
}: {
  count: number;
  loading: boolean;
  error: string | null;
  semester: string;
}) {
  let text: string;
  if (error) text = 'Catalog unavailable';
  else if (loading && count === 0) text = `Searching ${semester}…`;
  else text = `${count.toLocaleString()} class${count === 1 ? '' : 'es'} · ${semester}`;
  return (
    <View style={styles.resultLine}>
      <View style={[styles.resultDot, error ? { backgroundColor: Colors.error } : null]} />
      <Text style={styles.resultText}>{text}</Text>
    </View>
  );
}

// ---------- Section card ----------

interface SectionCardProps {
  section: CourseSectionResponse;
  index: number;
  creating: boolean;
  disabled: boolean;
  onPress: () => void;
  reduceMotion: boolean;
}

function SectionCard({
  section,
  index,
  creating,
  disabled,
  onPress,
  reduceMotion,
}: SectionCardProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const meta = [section.instructionMode, section.session, section.meetingTimes].filter(
    (v): v is string => Boolean(v)
  );
  const [code, number] = splitCourseCode(section.courseCode);

  const enter = reduceMotion
    ? FadeIn.duration(180)
    : FadeInDown.duration(360)
        .delay(Math.min(index, 8) * 40)
        .easing(OUT_EASE);

  return (
    <Animated.View entering={enter} style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(PRESSED_SCALE, Spring.press);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, Spring.press);
        }}
        disabled={disabled || creating}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Create whiteboard for ${section.courseCode} section ${section.section}`}
      >
        <View style={styles.cardEdge} />
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <View style={styles.codeBlock}>
              <Text style={styles.codeSubject}>{code}</Text>
              {number ? <Text style={styles.codeNumber}>{number}</Text> : null}
            </View>
            <View style={styles.cardTopRight}>
              <View style={styles.sectionPill}>
                <Text style={styles.sectionPillLabel}>SEC</Text>
                <Text style={styles.sectionPillValue}>{section.section}</Text>
              </View>
              <StatusDot open={section.openSection} />
            </View>
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>
            {section.courseName}
          </Text>

          <View style={styles.instructorRow}>
            <Ionicons name="person-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.instructorText} numberOfLines={1}>
              {section.instructor || 'Instructor TBA'}
            </Text>
            <Text style={styles.classNumber}>· #{section.classNumber}</Text>
          </View>

          {meta.length > 0 || section.noCostMaterialsSection || section.lowCostMaterialsSection ? (
            <View style={styles.metaChips}>
              {meta.map((m, i) => (
                <View key={`${section.id}-meta-${i}`} style={styles.metaChip}>
                  <Text style={styles.metaChipText} numberOfLines={1}>
                    {m}
                  </Text>
                </View>
              ))}
              {section.noCostMaterialsSection ? (
                <View style={[styles.metaChip, styles.freeChip]}>
                  <Text style={[styles.metaChipText, styles.freeChipText]}>FREE MATERIALS</Text>
                </View>
              ) : section.lowCostMaterialsSection ? (
                <View style={[styles.metaChip, styles.lowChip]}>
                  <Text style={[styles.metaChipText, styles.lowChipText]}>LOW-COST</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {creating ? (
          <View style={styles.cardSpinner}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

function StatusDot({ open }: { open: boolean }) {
  return (
    <View style={styles.statusGroup}>
      <View
        style={[
          styles.statusDot,
          { backgroundColor: open ? Colors.openStatus : Colors.closedStatus },
        ]}
      />
      <Text style={[styles.statusLabel, { color: open ? Colors.openStatus : Colors.closedStatus }]}>
        {open ? 'OPEN' : 'CLOSED'}
      </Text>
    </View>
  );
}

function splitCourseCode(code: string): [string, string] {
  const match = code.match(/^([A-Za-z]+)\s*(.*)$/);
  if (!match) return [code, ''];
  return [match[1].toUpperCase(), match[2].trim()];
}

// ---------- Sort sheet ----------

interface SortSheetProps {
  visible: boolean;
  onClose: () => void;
  sortBy: CourseCatalogSortBy;
  direction: CourseCatalogSortDirection;
  onChoose: (k: CourseCatalogSortBy) => void;
  onToggleDirection: () => void;
}

function SortSheet({
  visible,
  onClose,
  sortBy,
  direction,
  onChoose,
  onToggleDirection,
}: SortSheetProps) {
  const colorScheme = useColorScheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(180)}
        style={styles.sheetBackdrop}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close sort sheet"
        />
        <Animated.View
          entering={SlideInDown.duration(Duration.drawer).easing(IOS_EASE)}
          exiting={SlideOutDown.duration(280).easing(IOS_EASE)}
          style={styles.sheetWrapper}
        >
          <BlurView
            intensity={80}
            tint={colorScheme === 'dark' ? 'dark' : 'light'}
            style={styles.sheet}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetEyebrow}>SORT</Text>
                <Text style={styles.sheetTitle}>Order results</Text>
              </View>
              <Pressable
                onPress={onToggleDirection}
                style={styles.directionToggle}
                accessibilityRole="button"
                accessibilityLabel={`Switch to ${direction === 'ASC' ? 'descending' : 'ascending'}`}
              >
                <Ionicons
                  name={direction === 'ASC' ? 'arrow-up' : 'arrow-down'}
                  size={18}
                  color={Colors.text}
                />
                <Text style={styles.directionLabel}>
                  {direction === 'ASC' ? 'Ascending' : 'Descending'}
                </Text>
              </Pressable>
            </View>

            <SortGroup
              title="Common"
              options={PRIMARY_SORTS}
              sortBy={sortBy}
              direction={direction}
              onChoose={onChoose}
            />
            <SortGroup
              title="More"
              options={SECONDARY_SORTS}
              sortBy={sortBy}
              direction={direction}
              onChoose={onChoose}
            />

            <Pressable style={styles.sheetDone} onPress={onClose} accessibilityRole="button">
              <Text style={styles.sheetDoneText}>Done</Text>
            </Pressable>
          </BlurView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function SortGroup({
  title,
  options,
  sortBy,
  direction,
  onChoose,
}: {
  title: string;
  options: SortOption[];
  sortBy: CourseCatalogSortBy;
  direction: CourseCatalogSortDirection;
  onChoose: (k: CourseCatalogSortBy) => void;
}) {
  return (
    <View style={styles.sortGroup}>
      <Text style={styles.sortGroupTitle}>{title}</Text>
      <View style={styles.sortGrid}>
        {options.map((opt) => {
          const active = sortBy === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => onChoose(opt.key)}
              style={[styles.sortItem, active && styles.sortItemActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.sortItemText, active && styles.sortItemTextActive]}>
                {opt.label}
              </Text>
              {active ? (
                <Ionicons
                  name={direction === 'ASC' ? 'arrow-up' : 'arrow-down'}
                  size={14}
                  color={Colors.primary}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  iconButtonPressed: { backgroundColor: 'rgba(255,255,255,0.12)' },
  headerCopy: { marginLeft: 14, flex: 1 },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 2.4,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: -0.6,
  },

  filters: { paddingHorizontal: 20, paddingBottom: 8 },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 0,
  },
  clearButton: { marginLeft: 8, padding: 2 },

  segmented: {
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 12,
    padding: 4,
    position: 'relative',
  },
  segmentedIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: 11,
    backgroundColor: Colors.primary,
  },
  segmentedItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.2,
  },
  segmentedTextActive: { color: '#FFFFFF' },

  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  subjectField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  subjectPrefix: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    color: Colors.textMuted,
    marginRight: 8,
  },
  subjectInput: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.6,
    minWidth: 60,
    paddingVertical: 0,
  },
  sortPillWrapper: { flex: 1 },
  sortPill: {
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(187,39,68,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(187,39,68,0.40)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortPillLabel: {
    flex: 1,
    color: Colors.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  resultLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  resultDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginRight: 8,
  },
  resultText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  listContent: { padding: 20, paddingTop: 8, paddingBottom: 110 },
  loadingState: { minHeight: 240, alignItems: 'center', justifyContent: 'center' },
  emptyState: {
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyHint: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },

  card: {
    flexDirection: 'row',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
    marginBottom: 12,
  },
  cardPressed: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(187,39,68,0.45)',
  },
  cardEdge: { width: 3, backgroundColor: Colors.primary },
  cardBody: { flex: 1, padding: 14 },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  codeBlock: { flexDirection: 'row', alignItems: 'baseline' },
  codeSubject: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: -0.4,
  },
  codeNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: -0.4,
    marginLeft: 4,
  },
  cardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    gap: 4,
  },
  sectionPillLabel: { fontSize: 9, fontWeight: '900', color: Colors.textMuted, letterSpacing: 1 },
  sectionPillValue: { fontSize: 12, fontWeight: '900', color: Colors.text, letterSpacing: 0.4 },

  statusGroup: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },

  cardTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  instructorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  instructorText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', flexShrink: 1 },
  classNumber: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },

  metaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  metaChipText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700' },
  freeChip: { backgroundColor: 'rgba(34,197,94,0.16)', borderColor: 'rgba(34,197,94,0.40)' },
  freeChipText: { color: Colors.success, letterSpacing: 0.6 },
  lowChip: { backgroundColor: 'rgba(245,158,11,0.16)', borderColor: 'rgba(245,158,11,0.40)' },
  lowChipText: { color: Colors.warning, letterSpacing: 0.6 },

  cardSpinner: { position: 'absolute', right: 14, top: 14 },

  bottomBar: { position: 'absolute', left: 20, right: 20, bottom: 18 },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheetWrapper: { width: '100%' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 28,
    backgroundColor: 'rgba(20,12,16,0.94)',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.20)',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 12,
  },
  sheetEyebrow: { fontSize: 11, fontWeight: '900', color: Colors.primary, letterSpacing: 2.2 },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.text,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  directionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  directionLabel: { color: Colors.text, fontSize: 13, fontWeight: '800' },

  sortGroup: { marginBottom: 14 },
  sortGroupTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: Colors.textMuted,
    letterSpacing: 1.6,
    marginBottom: 8,
  },
  sortGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sortItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  sortItemActive: {
    backgroundColor: 'rgba(187,39,68,0.18)',
    borderColor: Colors.primary,
  },
  sortItemText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  sortItemTextActive: { color: Colors.text },

  sheetDone: {
    marginTop: 6,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetDoneText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.6 },
});
