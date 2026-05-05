import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface OrderItemRequest { productId: number; quantity: number; price: number; }
export interface OrderRequest {
  supplierId?: number; orderTitle: string; department?: string;
  priority?: string; paymentMethod?: string; budgetCode?: string;
  expectedDelivery?: string; status?: string; notes?: string;
  items: OrderItemRequest[];
}
export interface OrderItemResponse {
  orderItemId: number; productId: number; productName: string; quantity: number; price: number;
}
export interface OrderResponse {
  orderId: number; createdBy: number; createdByName: string;
  supplierId: number; supplierName?: string | null;
  orderTitle: string; department: string; priority: string; paymentMethod: string;
  budgetCode: string; expectedDelivery: string; status: string;
  totalAmount: number | null; createdAt: string; items: OrderItemResponse[];
  orderType?: string;
}
export interface ApiResponse<T> { success: boolean; message: string; data: T; }

@Injectable({ providedIn: 'root' })
export class OrderService {
  private base = environment.apiUrl + '/api/orders';
  constructor(private http: HttpClient) {}

  getAll(status?: string): Observable<ApiResponse<OrderResponse[]>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<ApiResponse<OrderResponse[]>>(this.base, { params });
  }

  getById(id: number): Observable<ApiResponse<OrderResponse>> {
    return this.http.get<ApiResponse<OrderResponse>>(`${this.base}/${id}`);
  }

  create(req: OrderRequest): Observable<ApiResponse<OrderResponse>> {
    return this.http.post<ApiResponse<OrderResponse>>(this.base, req);
  }

  updateStatus(id: number, status: string): Observable<ApiResponse<OrderResponse>> {
    return this.http.patch<ApiResponse<OrderResponse>>(`${this.base}/${id}/status`, { status });
  }

  approve(id: number): Observable<ApiResponse<OrderResponse>> {
    return this.http.patch<ApiResponse<OrderResponse>>(`${this.base}/${id}/approve`, {});
  }

  reject(id: number): Observable<ApiResponse<OrderResponse>> {
    return this.http.patch<ApiResponse<OrderResponse>>(`${this.base}/${id}/reject`, {});
  }

  requestCancellation(id: number): Observable<ApiResponse<OrderResponse>> {
    return this.http.patch<ApiResponse<OrderResponse>>(`${this.base}/${id}/cancel-request`, {});
  }

  approveCancellation(id: number): Observable<ApiResponse<OrderResponse>> {
    return this.http.patch<ApiResponse<OrderResponse>>(`${this.base}/${id}/approve-cancel`, {});
  }

  rejectCancellation(id: number): Observable<ApiResponse<OrderResponse>> {
    return this.http.patch<ApiResponse<OrderResponse>>(`${this.base}/${id}/reject-cancel`, {});
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/${id}`);
  }
}
