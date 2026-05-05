package com.cts.mfrp.procuresphere.service;

import com.cts.mfrp.procuresphere.dto.response.DashboardSummaryResponse;
import com.cts.mfrp.procuresphere.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;
    private final DeliveryRepository deliveryRepository;
    private final NotificationRepository notificationRepository;

    @Transactional(readOnly = true)
    public DashboardSummaryResponse getSummary() {
        long inStock = productRepository.findWithFilters(null, null, true).size();
        long outOfStock = productRepository.findWithFilters(null, null, false).size();
        long deliveredOrders = deliveryRepository.findAll().stream()
                .filter(d -> "DELIVERED".equalsIgnoreCase(d.getStatus())).count();
        long pendingDeliveries = deliveryRepository.findAll().stream()
                .filter(d -> "PENDING".equalsIgnoreCase(d.getStatus())).count();
        long unreadNotifications = notificationRepository.countByIsRead(false);

        return DashboardSummaryResponse.builder()
                .totalUsers(userRepository.count())
                .totalCategories(categoryRepository.count())
                .totalProducts(productRepository.count())
                .inStockProducts(inStock)
                .outOfStockProducts(outOfStock)
                .totalOrders(orderRepository.count())
                .pendingOrders(orderRepository.countByStatus("PENDING"))
                .approvedOrders(orderRepository.countByStatus("APPROVED"))
                .totalDeliveries(deliveryRepository.count())
                .pendingDeliveries(pendingDeliveries)
                .deliveredOrders(deliveredOrders)
                .unreadNotifications(unreadNotifications)
                .build();
    }
}
