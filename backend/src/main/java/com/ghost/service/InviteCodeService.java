package com.ghost.service;

import com.ghost.repository.WhiteboardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;

@Service
@RequiredArgsConstructor
public class InviteCodeService {

    // Exclude visually ambiguous characters: I, L, O, 0, and 1.
    static final String INVITE_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final int INVITE_CODE_LENGTH = 8;
    private static final int INVITE_CODE_MAX_ATTEMPTS = 10;

    private final WhiteboardRepository whiteboardRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public String generate() {
        int attempts = 0;
        while (attempts++ < INVITE_CODE_MAX_ATTEMPTS) {
            StringBuilder code = new StringBuilder(INVITE_CODE_LENGTH);
            for (int i = 0; i < INVITE_CODE_LENGTH; i++) {
                code.append(INVITE_CODE_CHARS.charAt(secureRandom.nextInt(INVITE_CODE_CHARS.length())));
            }

            String inviteCode = code.toString();
            if (!whiteboardRepository.existsByInviteCodeIgnoreCase(inviteCode)) {
                return inviteCode;
            }
        }

        throw new IllegalStateException("Failed to generate a unique invite code");
    }
}
