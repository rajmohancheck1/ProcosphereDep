package com.cts.mfrp.procuresphere.dto.request;

import jakarta.validation.constraints.Email;
import lombok.Data;

/**
 * Self-service profile update payload. Email is editable but unique-checked
 * against other users. Role is intentionally NOT editable here (admin-only).
 */
@Data
public class ProfileUpdateRequest {
    private String firstName;
    private String lastName;

    @Email(message = "Invalid email format")
    private String email;

    private String phone;
    private String department;
    private String company;
    private String address;
    private String avatarUrl;
}
