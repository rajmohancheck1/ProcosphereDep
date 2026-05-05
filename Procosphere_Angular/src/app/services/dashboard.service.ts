import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DashboardSummaryResponse {
  totalUsers: number; totalCategories: number; totalProducts: number;
  inStockProducts: number; outOfStockProducts: number; totalOrders: number;
  pendingOrders: number; approvedOrders: number; totalDeliveries: number;
  pendingDeliveries: number; deliveredOrders: number; unreadNotifications: number;
}
export interface ApiResponse<T> { success: boolean; message: string; data: T; }

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private base = environment.apiUrl + '/api/dashboard';
  constructor(private http: HttpClient) {}

  getSummary(): Observable<ApiResponse<DashboardSummaryResponse>> {
    return this.http.get<ApiResponse<DashboardSummaryResponse>>(`${this.base}/summary`);
  }
}
