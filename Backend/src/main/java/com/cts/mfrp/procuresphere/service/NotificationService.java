package com.cts.mfrp.procuresphere.service;

import com.cts.mfrp.procuresphere.dto.request.NotificationRequest;
import com.cts.mfrp.procuresphere.dto.response.NotificationResponse;
import com.cts.mfrp.procuresphere.exception.ResourceNotFoundException;
import com.cts.mfrp.procuresphere.model.Notification;
import com.cts.mfrp.procuresphere.model.User;
import com.cts.mfrp.procuresphere.repository.NotificationRepository;
import com.cts.mfrp.procuresphere.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<NotificationResponse> getAllNotifications() {
        return notificationRepository.findAll().stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotificationsForUser(Long userId) {
        return notificationRepository.findByUserUserId(userId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> getUnreadNotifications(Long userId) {
        return notificationRepository.findByUserUserIdAndIsRead(userId, false).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public NotificationResponse createNotification(NotificationRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + request.getUserId()));

        Notification notification = Notification.builder()
                .user(user)
                .notificationType(request.getNotificationType())
                .message(request.getMessage())
                .isRead(false)
                .build();

        return toResponse(notificationRepository.save(notification));
    }

    @Transactional
    public NotificationResponse markAsRead(Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + id));
        notification.setIsRead(true);
        return toResponse(notificationRepository.save(notification));
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        List<Notification> unread = notificationRepository.findByUserUserIdAndIsRead(userId, false);
        unread.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(unread);
    }

    /** Internal helper: create a notification directly without a DTO (used by OrderService). */
    @Transactional
    public void sendToUser(User user, String type, String message) {
        Notification n = Notification.builder()
                .user(user)
                .notificationType(type)
                .message(message)
                .isRead(false)
                .build();
        notificationRepository.save(n);
    }

    @Transactional
    public void deleteNotification(Long id) {
        if (!notificationRepository.existsById(id)) {
            throw new ResourceNotFoundException("Notification not found with id: " + id);
        }
        notificationRepository.deleteById(id);
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .notificationId(n.getNotificationId())
                .userId(n.getUser() != null ? n.getUser().getUserId() : null)
                .notificationType(n.getNotificationType())
                .message(n.getMessage())
                .isRead(n.getIsRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
