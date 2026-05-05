package com.cts.mfrp.procuresphere.repository;

import com.cts.mfrp.procuresphere.model.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByCategoryCategoryId(Long categoryId);

    List<Product> findBySupplierId(Integer supplierId);

    @Query("SELECT p FROM Product p WHERE " +
           "(:search IS NULL OR LOWER(p.productName) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
           "(:categoryId IS NULL OR p.category.categoryId = :categoryId) AND " +
           "(:isInStock IS NULL OR p.isInStock = :isInStock)")
    List<Product> findWithFilters(@Param("search") String search,
                                  @Param("categoryId") Long categoryId,
                                  @Param("isInStock") Boolean isInStock);
}
