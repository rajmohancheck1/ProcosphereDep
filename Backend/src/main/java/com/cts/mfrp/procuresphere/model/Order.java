package com.cts.mfrp.procuresphere.model;



import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "order_id")
    private Long orderId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "supplier_id")
    private Integer supplierId;

    @Column(name = "order_title", length = 150)
    private String orderTitle;

    @Column(length = 100)
    private String department;

    @Column(length = 50)
    private String priority;

    @Column(name = "payment_method", length = 50)
    private String paymentMethod;

    @Column(name = "budget_code", length = 50)
    private String budgetCode;

    @Column(name = "expected_delivery")
    private LocalDate expectedDelivery;

    @Column(length = 50)
    private String status;

    @Column(name = "total_amount")
    private Float totalAmount;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // REQUISITION = user ordering from inventory (stock goes out on approval)
    // PURCHASE    = manager ordering from supplier (stock comes in on received)
    @Column(name = "order_type", length = 20)
    private String orderType;

    // Saved when user requests cancellation (CANCEL_REQUESTED), to restore stock correctly
    @Column(name = "cancel_requested_from_status", length = 50)
    private String cancelRequestedFromStatus;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (status == null) status = "PENDING";
        if (orderType == null) orderType = "REQUISITION";
    }
}
