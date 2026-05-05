package com.cts.mfrp.procuresphere.repository;

import com.cts.mfrp.procuresphere.model.Delivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeliveryRepository extends JpaRepository<Delivery, Long> {
    List<Delivery> findByOrderOrderId(Long orderId);
    Optional<Delivery> findByTrackingNumber(String trackingNumber);

    @Query("SELECT d FROM Delivery d JOIN d.order o JOIN o.createdBy u WHERE u.userId = :userId")
    List<Delivery> findByOrderOwnerId(@Param("userId") Long userId);
}
