package com.leaveflow.service;

import com.leaveflow.entity.Employee;
import com.leaveflow.entity.Notification;
import com.leaveflow.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional
    public void notify(Employee recipient, String title, String message, String type, Long referenceId) {
        if (recipient == null) return;
        Notification notification = new Notification(recipient, title, message, type, referenceId);
        notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public List<Notification> getNotificationsForEmployee(Long employeeId) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(employeeId);
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long employeeId) {
        return notificationRepository.countByRecipientIdAndReadFalse(employeeId);
    }

    @Transactional
    public void markAsRead(Long notificationId, Long employeeId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getRecipient().getId().equals(employeeId)) {
                n.markAsRead();
            }
        });
    }

    @Transactional
    public void markAllAsRead(Long employeeId) {
        notificationRepository.markAllAsRead(employeeId);
    }
}
