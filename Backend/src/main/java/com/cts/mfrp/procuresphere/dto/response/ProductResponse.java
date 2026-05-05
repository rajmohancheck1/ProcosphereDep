package com.cts.mfrp.procuresphere.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponse {
    private Long productId;
    private Integer supplierId;
    private String supplierName;
    private Long categoryId;
    private String categoryName;
    private String productName;
    private String description;
    private Float price;
    private Integer stockQuantity;
    private Boolean isInStock;
    private String imageUrl;
}
