package com.cts.mfrp.procuresphere.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardSummaryResponse {
    private long totalUsers;
    private long totalCategories;
    private long totalProducts;
    private long inStockProducts;
    private long outOfStockProducts;
    private long totalOrders;
    private long pendingOrders;
    private long approvedOrders;
    private long totalDeliveries;
    private long pendingDeliveries;
    private long deliveredOrders;
    private long unreadNotifications;
}
