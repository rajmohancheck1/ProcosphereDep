package com.cts.mfrp.procuresphere.repository;

import com.cts.mfrp.procuresphere.model.PasswordResetRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PasswordResetRequestRepository extends JpaRepository<PasswordResetRequest, Long> {
    List<PasswordResetRequest> findByStatus(String status);
    List<PasswordResetRequest> findByUserUserId(Long userId);
    Optional<PasswordResetRequest> findFirstByUserUserIdAndStatusOrderByCreatedAtDesc(Long userId, String status);
}
