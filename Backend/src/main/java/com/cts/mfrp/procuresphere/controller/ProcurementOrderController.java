package com.cts.mfrp.procuresphere.controller;

import com.cts.mfrp.procuresphere.dto.request.OrderRequest;
import com.cts.mfrp.procuresphere.dto.response.ApiResponse;
import com.cts.mfrp.procuresphere.dto.response.OrderResponse;
import com.cts.mfrp.procuresphere.service.OrderService;
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
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Tag(name = "Orders", description = "Order creation and management")
@SecurityRequirement(name = "bearerAuth")
public class ProcurementOrderController {

    private final OrderService orderService;

    @GetMapping
    @Operation(summary = "Get all orders (USER sees own orders; ADMIN/MANAGER/SUPPLIER see all)")
    public ResponseEntity<ApiResponse<List<OrderResponse>>> getAllOrders(
            @RequestParam(required = false) String status,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getAllOrders(status, authentication.getName())));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get order by ID (USER can only fetch own orders)")
    public ResponseEntity<ApiResponse<OrderResponse>> getOrderById(
            @PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(orderService.getOrderById(id, authentication.getName())));
    }

    @PostMapping
    @Operation(summary = "Create a new order")
    public ResponseEntity<ApiResponse<OrderResponse>> createOrder(
            @Valid @RequestBody OrderRequest request,
            Authentication authentication) {
        OrderResponse response = orderService.createOrder(request, authentication.getName());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Order created successfully", response));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update an order")
    public ResponseEntity<ApiResponse<OrderResponse>> updateOrder(
            @PathVariable Long id,
            @Valid @RequestBody OrderRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Order updated",
                orderService.updateOrder(id, request, authentication.getName())));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update order status (generic)")
    public ResponseEntity<ApiResponse<OrderResponse>> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        return ResponseEntity.ok(ApiResponse.success("Order status updated",
                orderService.updateOrderStatus(id, status)));
    }

    @PatchMapping("/{id}/approve")
    @Operation(summary = "Approve order (Admin/Manager only) — checks inventory stock for REQUISITION orders")
    public ResponseEntity<ApiResponse<OrderResponse>> approveOrder(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Order approved",
                orderService.approveOrder(id)));
    }

    @PatchMapping("/{id}/reject")
    @Operation(summary = "Reject order (Admin/Manager only)")
    public ResponseEntity<ApiResponse<OrderResponse>> rejectOrder(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Order rejected",
                orderService.rejectOrder(id)));
    }

    @PatchMapping("/{id}/cancel-request")
    @Operation(summary = "Request cancellation (order owner only, before RECEIVED)")
    public ResponseEntity<ApiResponse<OrderResponse>> requestCancellation(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success(
                "Cancellation request submitted. Awaiting manager approval.",
                orderService.requestCancellation(id, authentication.getName())));
    }

    @PatchMapping("/{id}/approve-cancel")
    @Operation(summary = "Approve cancellation request (Admin/Manager only)")
    public ResponseEntity<ApiResponse<OrderResponse>> approveCancellation(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Cancellation approved. Order has been cancelled and stock restored.",
                orderService.approveCancellation(id)));
    }

    @PatchMapping("/{id}/reject-cancel")
    @Operation(summary = "Reject cancellation request (Admin/Manager only)")
    public ResponseEntity<ApiResponse<OrderResponse>> rejectCancellation(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Cancellation request rejected. Order continues with its previous status.",
                orderService.rejectCancellation(id)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an order")
    public ResponseEntity<ApiResponse<Void>> deleteOrder(@PathVariable Long id) {
        orderService.deleteOrder(id);
        return ResponseEntity.ok(ApiResponse.success("Order deleted", null));
    }
}
