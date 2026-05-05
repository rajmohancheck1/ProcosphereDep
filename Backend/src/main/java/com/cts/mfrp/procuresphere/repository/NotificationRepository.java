package com.cts.mfrp.procuresphere.repository;

import com.cts.mfrp.procuresphere.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserUserId(Long userId);
    List<Notification> findByUserUserIdAndIsRead(Long userId, Boolean isRead);
    long countByIsRead(Boolean isRead);
}
