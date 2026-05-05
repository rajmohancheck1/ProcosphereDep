package com.cts.mfrp.procuresphere.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class InventoryResponse {
    private Long id;
    private Long productId;
    private String productName;
    private String productSku;
    private String category;
    private Integer quantity;
    private Integer minStockLevel;
    private Integer maxStockLevel;
    private String location;
    private String warehouseSection;
    private boolean lowStock;
    private boolean outOfStock;
    private LocalDateTime lastUpdated;
}
