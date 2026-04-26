// ============================================================
// Ghost Frontend TypeScript Types
// Matches backend DTOs exactly
// ============================================================

// ---- Enums ----

export type Role = 'STUDENT' | 'FACULTY';

export type QuestionStatus = 'OPEN' | 'CLOSED';

export type VoteType = 'UPVOTE' | 'DOWNVOTE';

export type NotificationType =
  | 'QUESTION_ANSWERED'
  | 'COMMENT_ADDED'
  | 'QUESTION_FORWARDED'
  | 'JOIN_REQUEST_APPROVED'
  | 'JOIN_REQUEST_REJECTED'
  | 'REPORT_SUBMITTED'
  | 'CONTENT_HIDDEN'
  | 'POST_TRENDING';

export type ReportReason = 'SPAM' | 'INAPPROPRIATE' | 'HARASSMENT' | 'OFF_TOPIC' | 'OTHER';

export type ReportStatus = 'PENDING' | 'REVIEWED' | 'DISMISSED';

export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type AuditAction =
  | 'QUESTION_CREATED'
  | 'QUESTION_EDITED'
  | 'QUESTION_DELETED'
  | 'COMMENT_CREATED'
  | 'COMMENT_EDITED'
  | 'COMMENT_DELETED'
  | 'VERIFIED_ANSWER_PROVIDED'
  | 'QUESTION_CLOSED'
  | 'QUESTION_FORWARDED'
  | 'USER_ENLISTED'
  | 'USER_REMOVED'
  | 'WHITEBOARD_CREATED'
  | 'WHITEBOARD_DELETED'
  | 'REPORT_SUBMITTED'
  | 'REPORT_REVIEWED'
  | 'CONTENT_HIDDEN'
  | 'CONTENT_RESTORED'
  | 'NOTIFICATION_CREATED'
  | 'NOTIFICATION_READ'
  | 'NOTIFICATIONS_MARKED_READ'
  | 'COURSE_CATALOG_IMPORTED'
  | 'TOPIC_CREATED'
  | 'TOPIC_DELETED'
  | 'OWNERSHIP_TRANSFERRED';

// ---- Response Types ----

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  karmaScore: number;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserResponse;
}

export interface PasswordResetStartResponse {
  nextStep: 'RESET_PASSWORD' | 'VERIFY_EMAIL';
}

export interface WhiteboardResponse {
  id: string;
  courseCode: string;
  courseName: string;
  section: string | null;
  semester: string;
  ownerId: string;
  ownerName: string;
  inviteCode: string;
  isDemo: boolean;
  memberCount: number;
  createdAt: string;
}

export interface CourseSectionResponse {
  id: string;
  courseCode: string;
  courseName: string;
  subject: string | null;
  catalogNumber: string | null;
  departmentName: string | null;
  courseDescription: string | null;
  credit: string | null;
  semester: string;
  termId: string | null;
  section: string;
  classNumber: string;
  instructor: string | null;
  session: string | null;
  career: string | null;
  instructionMode: string | null;
  meetingPattern: string | null;
  meetingTimes: string | null;
  numberOfWeeks: number | null;
  openSection: boolean;
  lowCostMaterialsSection: boolean;
  noCostMaterialsSection: boolean;
}

export interface CourseCatalogImportResult {
  allowedTerms: string[];
  sectionsImported: number;
}

export interface QuestionResponse {
  id: string;
  whiteboardId: string;
  authorId: string;
  authorName: string;
  topicId: string | null;
  topicName: string | null;
  title: string;
  body: string;
  status: QuestionStatus;
  isPinned: boolean;
  isHidden: boolean;
  karmaScore: number;
  userVote: VoteType | null;
  commentCount: number;
  verifiedAnswerId: string | null;
  isBookmarked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommentResponse {
  id: string;
  questionId: string;
  authorId: string;
  authorName: string;
  body: string;
  isVerifiedAnswer: boolean;
  verifiedById: string | null;
  verifiedByName: string | null;
  karmaScore: number;
  userVote: VoteType | null;
  canEdit: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface TopicResponse {
  id: string;
  name: string;
  isDefault: boolean;
}

export interface BookmarkResponse {
  id: string;
  question: QuestionResponse;
  createdAt: string;
}

export interface JoinRequestResponse {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  whiteboardId: string;
  status: JoinRequestStatus;
  createdAt: string;
}

export interface ReportResponse {
  id: string;
  reporterId: string;
  reporterName: string;
  questionId: string | null;
  commentId: string | null;
  threadQuestionId: string | null;
  contentTitle: string | null;
  contentPreview: string | null;
  contentHidden: boolean;
  reason: ReportReason;
  notes: string | null;
  status: ReportStatus;
  createdAt: string;
}

export interface AuditLogResponse {
  id: string;
  actorId: string;
  actorName: string;
  action: AuditAction;
  targetType: string | null;
  targetId: string | null;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ---- Request Types ----

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface VerifyPasswordResetCodeRequest {
  email: string;
  code: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface CreateWhiteboardRequest {
  courseCode: string;
  courseName: string;
  section?: string;
  semester: string;
}

export interface CreateQuestionRequest {
  title: string;
  body: string;
  topicId?: string;
}

export interface EditQuestionRequest {
  title?: string;
  body?: string;
  topicId?: string;
}

export interface CreateCommentRequest {
  body: string;
}

export interface EditCommentRequest {
  body: string;
}

export interface ForwardQuestionRequest {
  targetFacultyId: string;
}

export interface VoteRequest {
  voteType: VoteType;
}

export interface TransferOwnershipRequest {
  newOwnerEmail: string;
}

export interface JoinRequestActionRequest {
  status: JoinRequestStatus;
}

export interface ReportRequest {
  questionId?: string;
  commentId?: string;
  reason: ReportReason;
  notes?: string;
}

export interface ReviewReportRequest {
  status: ReportStatus;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  settingsJson?: string;
}

// ---- Query Parameter Types ----

export interface PaginationParams {
  page?: number;
  size?: number;
}

export interface QuestionQueryParams extends PaginationParams {
  topicId?: string;
  status?: QuestionStatus;
}

export interface SearchParams extends PaginationParams {
  q?: string;
  whiteboard?: string;
  topic?: string;
  status?: QuestionStatus;
  from?: string;
  to?: string;
}

// ---- WebSocket Message Types ----

export interface WebSocketMessage<T = unknown> {
  type: string;
  payload: T;
}

// ---- Member Response (used by whiteboard members endpoint) ----

export interface MemberResponse {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  joinedAt: string;
}

// ---- Unread Count Response ----

export interface UnreadCountResponse {
  count: number;
}
