package com.cts.mfrp.procuresphere.service;

import com.cts.mfrp.procuresphere.dto.request.LoginRequest;
import com.cts.mfrp.procuresphere.dto.request.RegisterRequest;
import com.cts.mfrp.procuresphere.dto.response.AuthResponse;
import com.cts.mfrp.procuresphere.dto.response.PasswordResetRequestResponse;
import com.cts.mfrp.procuresphere.exception.BadRequestException;
import com.cts.mfrp.procuresphere.exception.ResourceNotFoundException;
import com.cts.mfrp.procuresphere.model.PasswordResetRequest;
import com.cts.mfrp.procuresphere.model.Role;
import com.cts.mfrp.procuresphere.model.User;
import com.cts.mfrp.procuresphere.repository.PasswordResetRequestRepository;
import com.cts.mfrp.procuresphere.repository.UserRepository;
import com.cts.mfrp.procuresphere.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordResetRequestRepository resetRequestRepository;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email '" + request.getEmail() + "' is already registered");
        }

        User user = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .role(Role.USER)
                .department(request.getDepartment())
                .company(request.getCompany())
                .address(request.getAddress())
                .avatarUrl(request.getAvatarUrl())
                .rememberMe(false)
                .build();

        userRepository.save(user);
        String token = jwtTokenProvider.generateToken(user.getEmail());
        return buildAuthResponse(user, token, false);
    }

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        String token = jwtTokenProvider.generateToken(authentication);
        User user = userRepository.findByEmail(request.getEmail()).orElseThrow();
        return buildAuthResponse(user, token, false);
    }

    // --- Forgot Password Flow ---

    @Transactional
    public void forgotPassword(String email) {
        if (email == null || !email.contains("@")) {
            throw new BadRequestException("Please provide a valid email address.");
        }
        User user = userRepository.findByEmail(email.trim())
                .orElse(null);
        // Return generic success even if email not found to avoid email enumeration
        if (user == null) return;

        // Check if there is already a pending request
        boolean alreadyPending = resetRequestRepository
                .findFirstByUserUserIdAndStatusOrderByCreatedAtDesc(user.getUserId(), "PENDING")
                .isPresent();
        if (alreadyPending) return; // silently ignore duplicate — don't reveal state

        PasswordResetRequest req = PasswordResetRequest.builder()
                .user(user)
                .status("PENDING")
                .build();
        resetRequestRepository.save(req);
    }

    @Transactional(readOnly = true)
    public List<PasswordResetRequestResponse> getAllResetRequests() {
        return resetRequestRepository.findAll().stream()
                .map(this::toResetResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PasswordResetRequestResponse> getPendingResetRequests() {
        return resetRequestRepository.findByStatus("PENDING").stream()
                .map(this::toResetResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void approvePasswordReset(Long requestId) {
        PasswordResetRequest req = resetRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Reset request not found: " + requestId));
        if (!"PENDING".equals(req.getStatus())) {
            throw new BadRequestException("Request is not in PENDING state.");
        }
        req.setStatus("APPROVED");
        resetRequestRepository.save(req);
    }

    @Transactional
    public void rejectPasswordReset(Long requestId) {
        PasswordResetRequest req = resetRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Reset request not found: " + requestId));
        if (!"PENDING".equals(req.getStatus())) {
            throw new BadRequestException("Request is not in PENDING state.");
        }
        req.setStatus("REJECTED");
        resetRequestRepository.save(req);
    }

    /**
     * Email-only login: allowed only if the user has an APPROVED password reset request.
     * Returns a JWT token with mustChangePassword = true.
     */
    @Transactional
    public AuthResponse loginByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("No account found with email: " + email));

        PasswordResetRequest req = resetRequestRepository
                .findFirstByUserUserIdAndStatusOrderByCreatedAtDesc(user.getUserId(), "APPROVED")
                .orElseThrow(() -> new BadRequestException(
                        "No approved password reset request found for this email. Please wait for admin approval."));

        // Mark it as USED so the user cannot log in this way again
        req.setStatus("USED");
        resetRequestRepository.save(req);

        String token = jwtTokenProvider.generateToken(user.getEmail());
        return buildAuthResponse(user, token, true);
    }

    /**
     * Set a new password after email-only login. Clears the mustChangePassword flag.
     */
    @Transactional
    public void setNewPassword(String userEmail, String newPassword) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    private AuthResponse buildAuthResponse(User user, String token, boolean mustChangePassword) {
        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(user.getUserId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .role(user.getRole())
                .mustChangePassword(mustChangePassword)
                .build();
    }

    private PasswordResetRequestResponse toResetResponse(PasswordResetRequest req) {
        User u = req.getUser();
        String name = (u.getFirstName() != null ? u.getFirstName() : "") + " " +
                      (u.getLastName()  != null ? u.getLastName()  : "");
        return PasswordResetRequestResponse.builder()
                .id(req.getId())
                .userId(u.getUserId())
                .userName(name.trim().isEmpty() ? u.getEmail() : name.trim())
                .userEmail(u.getEmail())
                .status(req.getStatus())
                .createdAt(req.getCreatedAt())
                .build();
    }
}
