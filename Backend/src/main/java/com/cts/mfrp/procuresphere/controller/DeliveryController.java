package com.cts.mfrp.procuresphere.controller;

import com.cts.mfrp.procuresphere.dto.request.DeliveryRequest;
import com.cts.mfrp.procuresphere.dto.response.ApiResponse;
import com.cts.mfrp.procuresphere.dto.response.DeliveryResponse;
import com.cts.mfrp.procuresphere.service.DeliveryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/deliveries")
@RequiredArgsConstructor
@Tag(name = "Deliveries", description = "Delivery tracking management")
@SecurityRequirement(name = "bearerAuth")
public class DeliveryController {

    private final DeliveryService deliveryService;

    @GetMapping
    @Operation(summary = "Get all deliveries (USER sees own; ADMIN/MANAGER/SUPPLIER see all)")
    public ResponseEntity<ApiResponse<List<DeliveryResponse>>> getAllDeliveries(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(deliveryService.getAllDeliveries(authentication.getName())));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get delivery by ID (USER can only fetch own order's deliveries)")
    public ResponseEntity<ApiResponse<DeliveryResponse>> getDeliveryById(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(deliveryService.getDeliveryById(id, authentication.getName())));
    }

    @GetMapping("/order/{orderId}")
    @Operation(summary = "Get deliveries by order ID (USER can only fetch own order's deliveries)")
    public ResponseEntity<ApiResponse<List<DeliveryResponse>>> getDeliveriesByOrder(
            @PathVariable Long orderId, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(deliveryService.getDeliveriesByOrder(orderId, authentication.getName())));
    }

    @PostMapping
    @Operation(summary = "Create a new delivery")
    public ResponseEntity<ApiResponse<DeliveryResponse>> createDelivery(@Valid @RequestBody DeliveryRequest request) {
        DeliveryResponse response = deliveryService.createDelivery(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Delivery created successfully", response));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update delivery details")
    public ResponseEntity<ApiResponse<DeliveryResponse>> updateDelivery(
            @PathVariable Long id, @RequestBody DeliveryRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Delivery updated", deliveryService.updateDelivery(id, request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a delivery")
    public ResponseEntity<ApiResponse<Void>> deleteDelivery(@PathVariable Long id) {
        deliveryService.deleteDelivery(id);
        return ResponseEntity.ok(ApiResponse.success("Delivery deleted", null));
    }
}
