package com.cts.mfrp.procuresphere.dto.request;

import com.cts.mfrp.procuresphere.model.SupplierStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SupplierRequest {

    @NotBlank(message = "Supplier name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    private String phone;
    private String address;
    private String contactPerson;
    private String website;
    private String notes;
    private SupplierStatus status;
}
