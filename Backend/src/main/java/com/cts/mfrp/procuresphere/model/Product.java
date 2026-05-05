package com.cts.mfrp.procuresphere.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "product_id")
    private Long productId;

    @Column(name = "supplier_id")
    private Integer supplierId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Column(name = "product_name", length = 150, nullable = false)
    private String productName;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Float price;

    @Column(name = "stock_quantity")
    private Integer stockQuantity;

    @Column(name = "is_in_stock")
    private Boolean isInStock;

    @Column(name = "image_url", length = 255)
    private String imageUrl;
}
