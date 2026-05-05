import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DeliveryResponse {
  deliveryId: number; orderId: number; orderTitle: string;
  trackingNumber: string | null; status: string | null;
  shippedDate: string | null; deliveredDate: string | null;
}
export interface DeliveryRequest {
  orderId: number;
  trackingNumber?: string | null;
  status?: string | null;
  shippedDate?: string | null;
  deliveredDate?: string | null;
}
export interface ApiResponse<T> { success: boolean; message: string; data: T; }

export const DELIVERY_STATUSES = [
  'PENDING', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED',
] as const;

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  private base = environment.apiUrl + '/api/deliveries';
  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<DeliveryResponse[]>> {
    return this.http.get<ApiResponse<DeliveryResponse[]>>(this.base);
  }

  getById(id: number): Observable<ApiResponse<DeliveryResponse>> {
    return this.http.get<ApiResponse<DeliveryResponse>>(`${this.base}/${id}`);
  }

  getByOrderId(orderId: number): Observable<ApiResponse<DeliveryResponse[]>> {
    return this.http.get<ApiResponse<DeliveryResponse[]>>(`${this.base}/order/${orderId}`);
  }

  create(req: DeliveryRequest): Observable<ApiResponse<DeliveryResponse>> {
    return this.http.post<ApiResponse<DeliveryResponse>>(this.base, req);
  }

  update(id: number, req: DeliveryRequest): Observable<ApiResponse<DeliveryResponse>> {
    return this.http.put<ApiResponse<DeliveryResponse>>(`${this.base}/${id}`, req);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/${id}`);
  }
}
