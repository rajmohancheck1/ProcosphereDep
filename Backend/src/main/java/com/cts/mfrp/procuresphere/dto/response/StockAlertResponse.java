package com.cts.mfrp.procuresphere.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class StockAlertResponse {
    private long lowStockCount;
    private long outOfStockCount;
    private List<InventoryResponse> lowStockItems;
    private List<InventoryResponse> outOfStockItems;
}
