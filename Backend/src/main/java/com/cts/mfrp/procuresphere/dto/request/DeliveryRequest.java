package com.cts.mfrp.procuresphere.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class DeliveryRequest {

    @NotNull(message = "Order ID is required")
    private Long orderId;

    private String trackingNumber;
    private String status;
    private LocalDateTime shippedDate;
    private LocalDateTime deliveredDate;
}
