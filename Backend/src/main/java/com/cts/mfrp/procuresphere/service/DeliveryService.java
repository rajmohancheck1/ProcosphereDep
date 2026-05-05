package com.cts.mfrp.procuresphere.service;

import com.cts.mfrp.procuresphere.dto.request.DeliveryRequest;
import com.cts.mfrp.procuresphere.dto.response.DeliveryResponse;
import com.cts.mfrp.procuresphere.exception.ResourceNotFoundException;
import com.cts.mfrp.procuresphere.model.Delivery;
import com.cts.mfrp.procuresphere.model.Order;
import com.cts.mfrp.procuresphere.model.Role;
import com.cts.mfrp.procuresphere.model.User;
import com.cts.mfrp.procuresphere.repository.DeliveryRepository;
import com.cts.mfrp.procuresphere.repository.OrderRepository;
import com.cts.mfrp.procuresphere.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DeliveryService {

    private final DeliveryRepository deliveryRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<DeliveryResponse> getAllDeliveries(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));

        List<Delivery> deliveries = (user.getRole() == Role.USER)
                ? deliveryRepository.findByOrderOwnerId(user.getUserId())
                : deliveryRepository.findAll();

        return deliveries.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DeliveryResponse getDeliveryById(Long id, String userEmail) {
        Delivery delivery = deliveryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery not found with id: " + id));

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));

        if (user.getRole() == Role.USER) {
            Order order = delivery.getOrder();
            if (order == null || order.getCreatedBy() == null ||
                    !order.getCreatedBy().getUserId().equals(user.getUserId())) {
                throw new ResourceNotFoundException("Delivery not found with id: " + id);
            }
        }
        return toResponse(delivery);
    }

    @Transactional(readOnly = true)
    public List<DeliveryResponse> getDeliveriesByOrder(Long orderId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userEmail));

        if (user.getRole() == Role.USER) {
            // Return only deliveries where this user owns the order
            return deliveryRepository.findByOrderOwnerId(user.getUserId()).stream()
                    .filter(d -> d.getOrder() != null && d.getOrder().getOrderId().equals(orderId))
                    .map(this::toResponse).collect(Collectors.toList());
        }
        return deliveryRepository.findByOrderOrderId(orderId).stream()
                .map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public DeliveryResponse createDelivery(DeliveryRequest request) {
        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with id: " + request.getOrderId()));

        Delivery delivery = Delivery.builder()
                .order(order)
                .trackingNumber(request.getTrackingNumber())
                .status(request.getStatus() != null ? request.getStatus() : "PENDING")
                .shippedDate(request.getShippedDate())
                .deliveredDate(request.getDeliveredDate())
                .build();

        return toResponse(deliveryRepository.save(delivery));
    }

    @Transactional
    public DeliveryResponse updateDelivery(Long id, DeliveryRequest request) {
        Delivery delivery = deliveryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Delivery not found with id: " + id));

        if (request.getTrackingNumber() != null) delivery.setTrackingNumber(request.getTrackingNumber());
        if (request.getStatus() != null) delivery.setStatus(request.getStatus());
        if (request.getShippedDate() != null) delivery.setShippedDate(request.getShippedDate());
        if (request.getDeliveredDate() != null) delivery.setDeliveredDate(request.getDeliveredDate());

        return toResponse(deliveryRepository.save(delivery));
    }

    @Transactional
    public void deleteDelivery(Long id) {
        if (!deliveryRepository.existsById(id)) {
            throw new ResourceNotFoundException("Delivery not found with id: " + id);
        }
        deliveryRepository.deleteById(id);
    }

    private DeliveryResponse toResponse(Delivery d) {
        return DeliveryResponse.builder()
                .deliveryId(d.getDeliveryId())
                .orderId(d.getOrder() != null ? d.getOrder().getOrderId() : null)
                .orderTitle(d.getOrder() != null ? d.getOrder().getOrderTitle() : null)
                .trackingNumber(d.getTrackingNumber())
                .status(d.getStatus())
                .shippedDate(d.getShippedDate())
                .deliveredDate(d.getDeliveredDate())
                .build();
    }
}
