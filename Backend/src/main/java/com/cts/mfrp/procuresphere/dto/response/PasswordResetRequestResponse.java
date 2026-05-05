package com.cts.mfrp.procuresphere.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PasswordResetRequestResponse {
    private Long id;
    private Long userId;
    private String userName;
    private String userEmail;
    private String status;
    private LocalDateTime createdAt;
}
