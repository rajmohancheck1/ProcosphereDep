package com.cts.mfrp.procuresphere.repository;

import com.cts.mfrp.procuresphere.model.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByStatus(String status);
    List<Order> findBySupplierId(Integer supplierId);
    long countByStatus(String status);

    @Query("SELECT o FROM Order o WHERE o.createdBy.userId = :userId")
    List<Order> findByOwnerId(@Param("userId") Long userId);

    @Query("SELECT o FROM Order o WHERE o.createdBy.userId = :userId AND o.status = :status")
    List<Order> findByOwnerIdAndStatus(@Param("userId") Long userId, @Param("status") String status);
}
