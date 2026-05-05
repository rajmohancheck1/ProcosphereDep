package com.cts.mfrp.procuresphere.service;

import com.cts.mfrp.procuresphere.dto.request.OrderRequest;
import com.cts.mfrp.procuresphere.dto.response.OrderItemResponse;
import com.cts.mfrp.procuresphere.dto.response.OrderResponse;
import com.cts.mfrp.procuresphere.exception.BadRequestException;
import com.cts.mfrp.procuresphere.exception.ResourceNotFoundException;
import com.cts.mfrp.procuresphere.model.*;
import com.cts.mfrp.procuresphere.model.Delivery;
import com.cts.mfrp.procuresphere.repository.DeliveryRepository;
import com.cts.mfrp.procuresphere.repository.OrderRepository;
import com.cts.mfrp.procuresphere.repository.ProductRepository;
import com.cts.mfrp.procuresphere.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final NotificationService notificationService;
    private final DeliveryRepository deliveryRepository;

    @Transactional(readOnly = true)
    public List<OrderResponse> getAllOrders(String status, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));

        List<Order> orders;
        if (user.getRole() == Role.USER) {
            orders = (status != null && !status.isBlank())
                    ? orderRepository.findByOwnerIdAndStatus(user.getUserId(), status.toUpperCase())
                    : orderRepository.findByOwnerId(user.getUserId());
        } else {
            orders = (status != null && !status.isBlank())
                    ? orderRepository.findByStatus(status)
                    : orderRepository.findAll();
        }
        return orders.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public OrderResponse getOrderById(Long id, String userEmail) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));

        if (user.getRole() == Role.USER &&
                (order.getCreatedBy() == null || !order.getCreatedBy().getUserId().equals(user.getUserId()))) {
            throw new ResourceNotFoundException("Order not found with id: " + id);
        }
        return toResponse(order);
    }

    @Transactional
    public OrderResponse createOrder(OrderRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));

        // PURCHASE orders are created by Manager/Admin (stock arrives later)
        // REQUISITION orders are created by User/Supplier (stock goes out on approval)
        boolean isPurchase = user.getRole() == Role.MANAGER || user.getRole() == Role.ADMIN;
        String orderType = isPurchase ? "PURCHASE" : "REQUISITION";

        Order order = Order.builder()
                .createdBy(user)
                .supplierId(request.getSupplierId())
                .orderTitle(request.getOrderTitle())
                .department(request.getDepartment())
                .priority(request.getPriority() != null ? request.getPriority() : "MEDIUM")
                .paymentMethod(request.getPaymentMethod())
                .budgetCode(request.getBudgetCode())
                .expectedDelivery(request.getExpectedDelivery())
                .status(request.getStatus() != null ? request.getStatus() : "PENDING")
                .orderType(orderType)
                .items(new ArrayList<>())
                .build();

        float total = 0f;
        for (var itemReq : request.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + itemReq.getProductId()));

            OrderItem item = OrderItem.builder()
                    .order(order)
                    .product(product)
                    .quantity(itemReq.getQuantity())
                    .price(itemReq.getPrice())
                    .build();
            order.getItems().add(item);
            total += (itemReq.getPrice() != null ? itemReq.getPrice() : 0f) * itemReq.getQuantity();
        }
        order.setTotalAmount(total);

        Order saved = orderRepository.save(order);

        // Notify order creator
        notificationService.sendToUser(user, "ORDER_CREATED",
                "Your order '" + saved.getOrderTitle() + "' has been submitted and is awaiting approval.");
        // Notify all managers and admins
        String approvalMsg = "New order '" + saved.getOrderTitle() + "' by "
                + user.getFirstName() + " " + user.getLastName() + " requires your approval.";
        notifyStaff("APPROVAL_REQUIRED", approvalMsg);

        return toResponse(saved);
    }

    @Transactional
    public OrderResponse updateOrderStatus(Long id, String status) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));

        String oldStatus = order.getStatus();
        String newStatus = status != null ? status.toUpperCase() : oldStatus;
        String orderType = order.getOrderType() != null ? order.getOrderType() : "REQUISITION";

        applyStockLogic(order, oldStatus, newStatus, orderType);

        order.setStatus(newStatus);
        Order saved = orderRepository.save(order);

        if (saved.getCreatedBy() != null) {
            String notifType = statusToNotificationType(newStatus);
            String msg = "Your order '" + saved.getOrderTitle() + "' status has been updated to " + newStatus + ".";
            notificationService.sendToUser(saved.getCreatedBy(), notifType, msg);
        }

        syncDeliveryStatus(saved, newStatus);
        return toResponse(saved);
    }

    /**
     * Approve a REQUISITION order: checks inventory has enough stock first.
     * Approve a PURCHASE order: no stock check (stock arrives on RECEIVED).
     */
    @Transactional
    public OrderResponse approveOrder(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));

        if (!"PENDING".equals(order.getStatus())) {
            throw new BadRequestException("Only PENDING orders can be approved.");
        }

        String orderType = order.getOrderType() != null ? order.getOrderType() : "REQUISITION";

        // For REQUISITION: check that stock is available before approving
        if ("REQUISITION".equals(orderType) && order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                Product p = item.getProduct();
                if (p == null) continue;
                int available = p.getStockQuantity() != null ? p.getStockQuantity() : 0;
                if (available < item.getQuantity()) {
                    throw new BadRequestException(
                            "Insufficient inventory for '" + p.getProductName() + "': " +
                            item.getQuantity() + " requested, only " + available + " available. " +
                            "Cannot approve until inventory has enough stock.");
                }
            }
        }

        applyStockLogic(order, order.getStatus(), "APPROVED", orderType);
        order.setStatus("APPROVED");
        Order approvedOrder = orderRepository.save(order);

        if (approvedOrder.getCreatedBy() != null) {
            notificationService.sendToUser(approvedOrder.getCreatedBy(), "ORDER_APPROVED",
                    "Your order '" + approvedOrder.getOrderTitle() + "' has been approved.");
        }

        // Auto-create a delivery record if one doesn't already exist
        boolean deliveryExists = !deliveryRepository.findByOrderOrderId(approvedOrder.getOrderId()).isEmpty();
        if (!deliveryExists) {
            Delivery delivery = Delivery.builder()
                    .order(approvedOrder)
                    .trackingNumber("TRK-" + approvedOrder.getOrderId())
                    .status("PENDING")
                    .build();
            deliveryRepository.save(delivery);
        }

        return toResponse(approvedOrder);
    }

    @Transactional
    public OrderResponse rejectOrder(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));
        if (!"PENDING".equals(order.getStatus())) {
            throw new BadRequestException("Only PENDING orders can be rejected.");
        }
        applyStockLogic(order, order.getStatus(), "REJECTED", order.getOrderType() != null ? order.getOrderType() : "REQUISITION");
        order.setStatus("REJECTED");
        Order rejectedOrder = orderRepository.save(order);

        if (rejectedOrder.getCreatedBy() != null) {
            notificationService.sendToUser(rejectedOrder.getCreatedBy(), "ORDER_REJECTED",
                    "Your order '" + rejectedOrder.getOrderTitle() + "' has been rejected.");
        }
        return toResponse(rejectedOrder);
    }

    /**
     * User requests cancellation. Saves the current status so stock can be
     * correctly restored if the manager later approves the cancellation.
     */
    @Transactional
    public OrderResponse requestCancellation(Long id, String requestingUserEmail) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));

        List<String> cancellableStatuses = List.of("PENDING", "APPROVED", "ORDERED");
        if (!cancellableStatuses.contains(order.getStatus())) {
            throw new BadRequestException("Cannot request cancellation for an order with status: " + order.getStatus());
        }

        User requester = userRepository.findByEmail(requestingUserEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + requestingUserEmail));

        // Only the order owner can request cancellation
        if (!order.getCreatedBy().getUserId().equals(requester.getUserId())) {
            throw new BadRequestException("Only the order owner can request cancellation.");
        }

        order.setCancelRequestedFromStatus(order.getStatus());
        order.setStatus("CANCEL_REQUESTED");
        Order saved = orderRepository.save(order);

        String cancelMsg = "Cancellation requested for order '" + saved.getOrderTitle() + "' by "
                + requester.getFirstName() + " " + requester.getLastName() + ".";
        notifyStaff("APPROVAL_REQUIRED", cancelMsg);

        return toResponse(saved);
    }

    /**
     * Manager approves a cancellation request. Restores stock if needed.
     */
    @Transactional
    public OrderResponse approveCancellation(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));

        if (!"CANCEL_REQUESTED".equals(order.getStatus())) {
            throw new BadRequestException("Order is not in CANCEL_REQUESTED state.");
        }

        String orderType = order.getOrderType() != null ? order.getOrderType() : "REQUISITION";
        String prevStatus = order.getCancelRequestedFromStatus();

        // Restore stock if it was deducted in the previous status (REQUISITION orders)
        if ("REQUISITION".equals(orderType) && isRequisitionStockDeductedState(prevStatus)) {
            adjustStock(order, +1);
        }

        order.setStatus("CANCELLED");
        Order cancelled = orderRepository.save(order);

        if (cancelled.getCreatedBy() != null) {
            notificationService.sendToUser(cancelled.getCreatedBy(), "GENERAL",
                    "Your cancellation request for order '" + cancelled.getOrderTitle() + "' has been approved. The order is now cancelled.");
        }
        return toResponse(cancelled);
    }

    /**
     * Manager rejects a cancellation request. Restores order to previous status.
     */
    @Transactional
    public OrderResponse rejectCancellation(Long id) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));

        if (!"CANCEL_REQUESTED".equals(order.getStatus())) {
            throw new BadRequestException("Order is not in CANCEL_REQUESTED state.");
        }

        String prevStatus = order.getCancelRequestedFromStatus();
        order.setStatus(prevStatus != null ? prevStatus : "PENDING");
        order.setCancelRequestedFromStatus(null);
        Order restored = orderRepository.save(order);

        if (restored.getCreatedBy() != null) {
            notificationService.sendToUser(restored.getCreatedBy(), "GENERAL",
                    "Your cancellation request for order '" + restored.getOrderTitle() + "' was rejected. The order continues with status: " + restored.getStatus() + ".");
        }
        return toResponse(restored);
    }

    @Transactional
    public OrderResponse updateOrder(Long id, OrderRequest request, String userEmail) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + id));

        if (request.getOrderTitle() != null) order.setOrderTitle(request.getOrderTitle());
        if (request.getDepartment() != null) order.setDepartment(request.getDepartment());
        if (request.getPriority() != null) order.setPriority(request.getPriority());
        if (request.getPaymentMethod() != null) order.setPaymentMethod(request.getPaymentMethod());
        if (request.getBudgetCode() != null) order.setBudgetCode(request.getBudgetCode());
        if (request.getExpectedDelivery() != null) order.setExpectedDelivery(request.getExpectedDelivery());
        if (request.getStatus() != null) order.setStatus(request.getStatus());
        if (request.getSupplierId() != null) order.setSupplierId(request.getSupplierId());

        return toResponse(orderRepository.save(order));
    }

    @Transactional
    public void deleteOrder(Long id) {
        if (!orderRepository.existsById(id)) {
            throw new ResourceNotFoundException("Order not found with id: " + id);
        }
        orderRepository.deleteById(id);
    }

    // ---- Notification Helpers ----

    private void notifyStaff(String type, String message) {
        userRepository.findByRole(Role.MANAGER).forEach(u -> notificationService.sendToUser(u, type, message));
        userRepository.findByRole(Role.ADMIN).forEach(u -> notificationService.sendToUser(u, type, message));
    }

    private String statusToNotificationType(String status) {
        if (status == null) return "GENERAL";
        return switch (status.toUpperCase()) {
            case "APPROVED"  -> "ORDER_APPROVED";
            case "REJECTED"  -> "ORDER_REJECTED";
            case "ORDERED"   -> "ORDER_SHIPPED";
            case "RECEIVED"  -> "ORDER_DELIVERED";
            case "CANCELLED" -> "GENERAL";
            default          -> "GENERAL";
        };
    }

    private void syncDeliveryStatus(Order order, String orderStatus) {
        List<Delivery> deliveries = deliveryRepository.findByOrderOrderId(order.getOrderId());
        if (deliveries.isEmpty()) return;
        Delivery delivery = deliveries.get(0);
        String deliveryStatus = switch (orderStatus.toUpperCase()) {
            case "ORDERED"  -> "SHIPPED";
            case "RECEIVED" -> "DELIVERED";
            case "CANCELLED", "REJECTED" -> "RETURNED";
            default -> delivery.getStatus();
        };
        if (!deliveryStatus.equals(delivery.getStatus())) {
            delivery.setStatus(deliveryStatus);
            if ("DELIVERED".equals(deliveryStatus)) delivery.setDeliveredDate(java.time.LocalDateTime.now());
            if ("SHIPPED".equals(deliveryStatus)) delivery.setShippedDate(java.time.LocalDateTime.now());
            deliveryRepository.save(delivery);
        }
    }

    // ---- Stock Logic ----

    private void applyStockLogic(Order order, String oldStatus, String newStatus, String orderType) {
        if ("PURCHASE".equals(orderType)) {
            // PURCHASE orders: stock INCREASES when received from supplier
            boolean wasReceived = "RECEIVED".equals(oldStatus);
            boolean willBeReceived = "RECEIVED".equals(newStatus);
            if (!wasReceived && willBeReceived) {
                adjustStock(order, +1); // supplier delivered — add to inventory
            } else if (wasReceived && !willBeReceived) {
                adjustStock(order, -1); // undo if cancelled/returned after received
            }
        } else {
            // REQUISITION orders: stock DECREASES when approved (leaving inventory)
            // CANCEL_REQUESTED is a holding state — stock is not changed until
            // manager decides (approve = restore stock, reject = keep as is)
            if ("CANCEL_REQUESTED".equals(newStatus)) {
                // Do not adjust stock — just hold; cancelRequestedFromStatus already saved by caller
                return;
            }
            if ("CANCEL_REQUESTED".equals(oldStatus)) {
                // Manager is acting on the cancel request — handled by approveCancellation / rejectCancellation
                return;
            }
            boolean wasDeducted = isRequisitionStockDeductedState(oldStatus);
            boolean willBeDeducted = isRequisitionStockDeductedState(newStatus);
            if (!wasDeducted && willBeDeducted) {
                adjustStock(order, -1);
            } else if (wasDeducted && !willBeDeducted) {
                adjustStock(order, +1);
            }
        }
    }

    /** States where REQUISITION order stock has been deducted from inventory. */
    private boolean isRequisitionStockDeductedState(String status) {
        if (status == null) return false;
        return switch (status.toUpperCase()) {
            case "APPROVED", "ORDERED", "RECEIVED" -> true;
            default -> false;
        };
    }

    private void adjustStock(Order order, int direction) {
        if (order.getItems() == null) return;
        for (OrderItem item : order.getItems()) {
            Product p = item.getProduct();
            if (p == null) continue;
            int current = p.getStockQuantity() != null ? p.getStockQuantity() : 0;
            int delta = direction * item.getQuantity();
            int next = Math.max(0, current + delta);
            p.setStockQuantity(next);
            p.setIsInStock(next > 0);
            productRepository.save(p);
        }
    }

    private OrderResponse toResponse(Order o) {
        String supplierName = null;
        if (o.getSupplierId() != null) {
            supplierName = userRepository.findById(o.getSupplierId().longValue())
                    .map(u -> {
                        String full = ((u.getFirstName() == null ? "" : u.getFirstName()) + " "
                                     + (u.getLastName()  == null ? "" : u.getLastName())).trim();
                        return full.isEmpty() ? u.getEmail() : full;
                    })
                    .orElse(null);
        }
        List<OrderItemResponse> itemResponses = o.getItems() != null
                ? o.getItems().stream().map(i -> OrderItemResponse.builder()
                        .orderItemId(i.getOrderItemId())
                        .productId(i.getProduct() != null ? i.getProduct().getProductId() : null)
                        .productName(i.getProduct() != null ? i.getProduct().getProductName() : null)
                        .quantity(i.getQuantity())
                        .price(i.getPrice())
                        .build()).collect(Collectors.toList())
                : List.of();

        return OrderResponse.builder()
                .orderId(o.getOrderId())
                .createdBy(o.getCreatedBy() != null ? o.getCreatedBy().getUserId() : null)
                .createdByName(o.getCreatedBy() != null ?
                        o.getCreatedBy().getFirstName() + " " + o.getCreatedBy().getLastName() : null)
                .supplierId(o.getSupplierId())
                .supplierName(supplierName)
                .orderTitle(o.getOrderTitle())
                .department(o.getDepartment())
                .priority(o.getPriority())
                .paymentMethod(o.getPaymentMethod())
                .budgetCode(o.getBudgetCode())
                .expectedDelivery(o.getExpectedDelivery())
                .status(o.getStatus())
                .totalAmount(o.getTotalAmount())
                .createdAt(o.getCreatedAt())
                .items(itemResponses)
                .build();
    }
}
