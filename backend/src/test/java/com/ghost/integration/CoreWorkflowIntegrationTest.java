package com.ghost.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ghost.model.Comment;
import com.ghost.model.Course;
import com.ghost.model.FacultyUser;
import com.ghost.model.Question;
import com.ghost.model.Semester;
import com.ghost.model.StudentUser;
import com.ghost.model.User;
import com.ghost.model.Whiteboard;
import com.ghost.model.WhiteboardMembership;
import com.ghost.model.enums.QuestionStatus;
import com.ghost.model.enums.ReportReason;
import com.ghost.model.enums.Role;
import com.ghost.repository.CommentRepository;
import com.ghost.repository.CourseRepository;
import com.ghost.repository.QuestionRepository;
import com.ghost.repository.ReportRepository;
import com.ghost.repository.SemesterRepository;
import com.ghost.repository.UserRepository;
import com.ghost.repository.WhiteboardMembershipRepository;
import com.ghost.repository.WhiteboardRepository;
import com.ghost.security.JwtTokenProvider;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@Tag("integration")
class CoreWorkflowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private SemesterRepository semesterRepository;

    @Autowired
    private WhiteboardRepository whiteboardRepository;

    @Autowired
    private WhiteboardMembershipRepository whiteboardMembershipRepository;

    @Autowired
    private QuestionRepository questionRepository;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private ReportRepository reportRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Test
    void integrationRegisterThenVerifyEmailPersistsNormalizedVerifiedUser() throws Exception {
        String email = "integration-" + UUID.randomUUID() + "@ilstu.edu";

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email.toUpperCase(),
                                "password", "Passw0rd9",
                                "firstName", "Taylor",
                                "lastName", "Student"
                        ))))
                .andExpect(status().isCreated());

        User savedUser = userRepository.findByEmail(email).orElseThrow();
        assertThat(savedUser.isEmailVerified()).isFalse();
        assertThat(savedUser.getVerificationCode()).matches("\\d{6}");

        mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", email,
                                "code", savedUser.getVerificationCode()
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value(email))
                .andExpect(jsonPath("$.user.emailVerified").value(true));

        User verifiedUser = userRepository.findByEmail(email).orElseThrow();
        assertThat(verifiedUser.isEmailVerified()).isTrue();
        assertThat(verifiedUser.getVerificationCode()).isNull();
    }

    @Test
    void integrationQuestionCommentVerificationFlowClosesQuestion() throws Exception {
        FacultyUser faculty = saveFaculty("faculty-" + UUID.randomUUID() + "@ilstu.edu");
        StudentUser student = saveStudent("student-" + UUID.randomUUID() + "@ilstu.edu");
        Whiteboard whiteboard = saveWhiteboard(faculty);
        saveMembership(whiteboard, faculty, Role.FACULTY);
        saveMembership(whiteboard, student, Role.STUDENT);

        MvcResult questionResult = mockMvc.perform(post("/api/whiteboards/{wbId}/questions", whiteboard.getId())
                        .header("Authorization", bearerToken(student))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "title", "Need help with basis path testing",
                                "body", "How many paths should I test?"
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andReturn();

        UUID questionId = responseId(questionResult);

        MvcResult commentResult = mockMvc.perform(post("/api/questions/{qId}/comments", questionId)
                        .header("Authorization", bearerToken(faculty))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "body", "Start with the cyclomatic complexity."
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.body").value("Start with the cyclomatic complexity."))
                .andReturn();

        UUID commentId = responseId(commentResult);

        mockMvc.perform(post("/api/questions/{qId}/comments/{id}/verify", questionId, commentId)
                        .header("Authorization", bearerToken(faculty)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(commentId.toString()))
                .andExpect(jsonPath("$.verifiedById").value(faculty.getId().toString()))
                .andExpect(jsonPath("$.verifiedByName").value("Faculty Owner"))
                .andExpect(jsonPath("$.verifiedAnswer").value(true));

        Question persistedQuestion = questionRepository.findById(questionId).orElseThrow();
        Comment persistedComment = commentRepository.findById(commentId).orElseThrow();

        assertThat(persistedQuestion.getStatus()).isEqualTo(QuestionStatus.CLOSED);
        assertThat(persistedQuestion.getVerifiedAnswerId()).isEqualTo(commentId);
        assertThat(persistedComment.getVerifiedBy()).isNotNull();
        assertThat(persistedComment.getVerifiedBy().getId()).isEqualTo(faculty.getId());
    }

    @Test
    void integrationThirdQuestionReportAutoHidesQuestion() throws Exception {
        FacultyUser faculty = saveFaculty("moderator-" + UUID.randomUUID() + "@ilstu.edu");
        StudentUser author = saveStudent("author-" + UUID.randomUUID() + "@ilstu.edu");
        StudentUser reporterOne = saveStudent("reporter1-" + UUID.randomUUID() + "@ilstu.edu");
        StudentUser reporterTwo = saveStudent("reporter2-" + UUID.randomUUID() + "@ilstu.edu");
        StudentUser reporterThree = saveStudent("reporter3-" + UUID.randomUUID() + "@ilstu.edu");
        Whiteboard whiteboard = saveWhiteboard(faculty);
        saveMembership(whiteboard, faculty, Role.FACULTY);
        saveMembership(whiteboard, author, Role.STUDENT);
        saveMembership(whiteboard, reporterOne, Role.STUDENT);
        saveMembership(whiteboard, reporterTwo, Role.STUDENT);
        saveMembership(whiteboard, reporterThree, Role.STUDENT);

        Question question = questionRepository.save(Question.builder()
                .whiteboard(whiteboard)
                .author(author)
                .title("Unrelated question")
                .body("This should be moderated")
                .status(QuestionStatus.OPEN)
                .build());

        for (StudentUser reporter : new StudentUser[]{reporterOne, reporterTwo, reporterThree}) {
            mockMvc.perform(post("/api/reports")
                            .header("Authorization", bearerToken(reporter))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(Map.of(
                                    "questionId", question.getId(),
                                    "reason", ReportReason.SPAM.name(),
                                    "notes", "Integration moderation coverage"
                            ))))
                    .andExpect(status().isCreated());
        }

        Question moderatedQuestion = questionRepository.findById(question.getId()).orElseThrow();

        assertThat(moderatedQuestion.isHidden()).isTrue();
        assertThat(moderatedQuestion.getReportCount()).isEqualTo(3);
        assertThat(reportRepository.count()).isEqualTo(3);
    }

    private FacultyUser saveFaculty(String email) {
        return userRepository.save(FacultyUser.builder()
                .email(email)
                .passwordHash("hashed-password")
                .firstName("Faculty")
                .lastName("Owner")
                .emailVerified(true)
                .build());
    }

    private StudentUser saveStudent(String email) {
        return userRepository.save(StudentUser.builder()
                .email(email)
                .passwordHash("hashed-password")
                .firstName("Taylor")
                .lastName("Student")
                .emailVerified(true)
                .build());
    }

    private Whiteboard saveWhiteboard(FacultyUser owner) {
        Course course = courseRepository.save(Course.builder()
                .courseCode("IT326-" + UUID.randomUUID().toString().substring(0, 6))
                .courseName("Software Engineering")
                .section("001")
                .build());
        Semester semester = semesterRepository.save(Semester.builder()
                .name("Fall-" + UUID.randomUUID().toString().substring(0, 8))
                .build());

        return whiteboardRepository.save(Whiteboard.builder()
                .course(course)
                .semester(semester)
                .owner(owner)
                .inviteCode("JOIN" + UUID.randomUUID().toString().replace("-", "").substring(0, 8))
                .build());
    }

    private void saveMembership(Whiteboard whiteboard, User user, Role role) {
        whiteboardMembershipRepository.save(WhiteboardMembership.builder()
                .whiteboard(whiteboard)
                .user(user)
                .role(role)
                .build());
    }

    private UUID responseId(MvcResult result) throws Exception {
        JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
        return UUID.fromString(body.get("id").asText());
    }

    private String bearerToken(User user) {
        return "Bearer " + jwtTokenProvider.generateAccessToken(
                user.getId(),
                user.getEmail(),
                user.getRole().name()
        );
    }
}
