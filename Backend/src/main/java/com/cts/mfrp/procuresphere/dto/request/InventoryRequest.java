package com.cts.mfrp.procuresphere.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class InventoryRequest {

    @NotNull(message = "Product ID is required")
    private Long productId;

    @NotNull(message = "Quantity is required")
    @Min(value = 0, message = "Quantity cannot be negative")
    private Integer quantity;

    @Min(value = 0, message = "Min stock level cannot be negative")
    private Integer minStockLevel;

    @Min(value = 1, message = "Max stock level must be at least 1")
    private Integer maxStockLevel;

    private String location;
    private String warehouseSection;
}
