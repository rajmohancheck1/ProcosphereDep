package com.cts.mfrp.procuresphere.dto.response;

import com.cts.mfrp.procuresphere.model.SupplierStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class SupplierResponse {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String address;
    private String contactPerson;
    private String website;
    private String notes;
    private SupplierStatus status;
    private int productCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
