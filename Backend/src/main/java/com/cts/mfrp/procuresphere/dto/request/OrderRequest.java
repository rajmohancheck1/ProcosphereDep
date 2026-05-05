package com.cts.mfrp.procuresphere.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class OrderRequest {

    private Integer supplierId;

    @NotBlank(message = "Order title is required")
    private String orderTitle;

    private String department;
    private String priority;
    private String paymentMethod;
    private String budgetCode;
    private LocalDate expectedDelivery;
    private String status;

    @NotEmpty(message = "Order must have at least one item")
    @Valid
    private List<OrderItemRequest> items;
}
