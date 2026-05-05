package com.cts.mfrp.procuresphere.controller;

import com.cts.mfrp.procuresphere.dto.request.*;
import com.cts.mfrp.procuresphere.dto.response.ApiResponse;
import com.cts.mfrp.procuresphere.dto.response.AuthResponse;
import com.cts.mfrp.procuresphere.dto.response.PasswordResetRequestResponse;
import com.cts.mfrp.procuresphere.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Register, login, and password reset endpoints")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @Operation(summary = "Register a new user")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("User registered successfully", response));
    }

    @PostMapping("/login")
    @Operation(summary = "Login with email and password to obtain JWT token")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    // ---- Forgot Password Flow ----

    @PostMapping("/forgot-password")
    @Operation(summary = "Submit a password reset request using registered email")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success(
                "Password reset request submitted. Please wait for admin approval. You will be able to log in with your email once approved.", null));
    }

    @PostMapping("/login-email")
    @Operation(summary = "Email-only login after admin approves password reset (returns token with mustChangePassword=true)")
    public ResponseEntity<ApiResponse<AuthResponse>> loginByEmail(@Valid @RequestBody EmailLoginRequest request) {
        AuthResponse response = authService.loginByEmail(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success("Login successful. Please set your new password.", response));
    }

    @PostMapping("/set-password")
    @Operation(summary = "Set new password after email-only login (authenticated)")
    public ResponseEntity<ApiResponse<Void>> setNewPassword(
            @Valid @RequestBody SetPasswordRequest request,
            Authentication authentication) {
        authService.setNewPassword(authentication.getName(), request.getNewPassword());
        return ResponseEntity.ok(ApiResponse.success("Password updated successfully. You can now log in with your new password.", null));
    }

    // ---- Admin: Manage Password Reset Requests ----

    @GetMapping("/password-reset-requests")
    @Operation(summary = "Admin: Get all password reset requests")
    public ResponseEntity<ApiResponse<List<PasswordResetRequestResponse>>> getAllResetRequests() {
        return ResponseEntity.ok(ApiResponse.success(authService.getAllResetRequests()));
    }

    @GetMapping("/password-reset-requests/pending")
    @Operation(summary = "Admin: Get pending password reset requests")
    public ResponseEntity<ApiResponse<List<PasswordResetRequestResponse>>> getPendingResetRequests() {
        return ResponseEntity.ok(ApiResponse.success(authService.getPendingResetRequests()));
    }

    @PatchMapping("/password-reset-requests/{id}/approve")
    @Operation(summary = "Admin: Approve a password reset request")
    public ResponseEntity<ApiResponse<Void>> approveResetRequest(@PathVariable Long id) {
        authService.approvePasswordReset(id);
        return ResponseEntity.ok(ApiResponse.success("Password reset request approved. The user can now log in with their email.", null));
    }

    @PatchMapping("/password-reset-requests/{id}/reject")
    @Operation(summary = "Admin: Reject a password reset request")
    public ResponseEntity<ApiResponse<Void>> rejectResetRequest(@PathVariable Long id) {
        authService.rejectPasswordReset(id);
        return ResponseEntity.ok(ApiResponse.success("Password reset request rejected.", null));
    }
}
