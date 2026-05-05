package com.cts.mfrp.procuresphere.repository;

import com.cts.mfrp.procuresphere.model.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    List<OrderItem> findByOrderOrderId(Long orderId);
    List<OrderItem> findByProductProductId(Long productId);
    void deleteByOrderOrderId(Long orderId);
}
