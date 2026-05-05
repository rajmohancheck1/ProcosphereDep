package com.cts.mfrp.procuresphere.dto.response;

import com.cts.mfrp.procuresphere.model.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long userId;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private Role role;
    private String department;
    private String company;
    private String address;
    private String avatarUrl;
}
