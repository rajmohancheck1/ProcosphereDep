package com.cts.mfrp.procuresphere.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {
    private Long orderId;
    private Long createdBy;
    private String createdByName;
    private Integer supplierId;
    private String supplierName;
    private String orderTitle;
    private String department;
    private String priority;
    private String paymentMethod;
    private String budgetCode;
    private LocalDate expectedDelivery;
    private String status;
    private Float totalAmount;
    private LocalDateTime createdAt;
    private List<OrderItemResponse> items;
}
