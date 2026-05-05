package com.cts.mfrp.procuresphere.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class EmailLoginRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Must be a valid email")
    private String email;
}
