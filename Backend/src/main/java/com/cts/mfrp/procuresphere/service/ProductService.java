package com.cts.mfrp.procuresphere.service;

import com.cts.mfrp.procuresphere.dto.request.ProductRequest;
import com.cts.mfrp.procuresphere.dto.response.ProductResponse;
import com.cts.mfrp.procuresphere.exception.ResourceNotFoundException;
import com.cts.mfrp.procuresphere.model.Category;
import com.cts.mfrp.procuresphere.model.Product;
import com.cts.mfrp.procuresphere.repository.CategoryRepository;
import com.cts.mfrp.procuresphere.repository.ProductRepository;
import com.cts.mfrp.procuresphere.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ProductResponse> getAllProducts(String search, Long categoryId, Boolean isInStock) {
        return productRepository.findWithFilters(search, categoryId, isInStock)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id) {
        return toResponse(productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id)));
    }

    @Transactional
    public ProductResponse createProduct(ProductRequest request) {
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + request.getCategoryId()));

        Product product = Product.builder()
                .supplierId(request.getSupplierId())
                .category(category)
                .productName(request.getProductName())
                .description(request.getDescription())
                .price(request.getPrice())
                .stockQuantity(request.getStockQuantity() != null ? request.getStockQuantity() : 0)
                .isInStock(request.getIsInStock() != null ? request.getIsInStock() : true)
                .imageUrl(request.getImageUrl())
                .build();

        return toResponse(productRepository.save(product));
    }

    @Transactional
    public ProductResponse updateProduct(Long id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + request.getCategoryId()));

        product.setSupplierId(request.getSupplierId());
        product.setCategory(category);
        product.setProductName(request.getProductName());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        if (request.getStockQuantity() != null) product.setStockQuantity(request.getStockQuantity());
        if (request.getIsInStock() != null) product.setIsInStock(request.getIsInStock());
        if (request.getImageUrl() != null) product.setImageUrl(request.getImageUrl());

        return toResponse(productRepository.save(product));
    }

    @Transactional
    public void deleteProduct(Long id) {
        if (!productRepository.existsById(id)) {
            throw new ResourceNotFoundException("Product not found with id: " + id);
        }
        productRepository.deleteById(id);
    }

    private ProductResponse toResponse(Product p) {
        // Resolve supplier name from the user identified by supplierId.
        String supplierName = null;
        if (p.getSupplierId() != null) {
            supplierName = userRepository.findById(p.getSupplierId().longValue())
                    .map(u -> {
                        String full = ((u.getFirstName() == null ? "" : u.getFirstName()) + " "
                                     + (u.getLastName()  == null ? "" : u.getLastName())).trim();
                        return full.isEmpty() ? u.getEmail() : full;
                    })
                    .orElse(null);
        }
        return ProductResponse.builder()
                .productId(p.getProductId())
                .supplierId(p.getSupplierId())
                .supplierName(supplierName)
                .categoryId(p.getCategory() != null ? p.getCategory().getCategoryId() : null)
                .categoryName(p.getCategory() != null ? p.getCategory().getCategoryName() : null)
                .productName(p.getProductName())
                .description(p.getDescription())
                .price(p.getPrice())
                .stockQuantity(p.getStockQuantity())
                .isInStock(p.getIsInStock())
                .imageUrl(p.getImageUrl())
                .build();
    }
}
