import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NotificationResponse {
  notificationId: number; userId: number; notificationType: string;
  message: string;
  isRead: boolean;   // alias
  read: boolean;     // Jackson strips "is" from Lombok getter isRead() → "read"
  createdAt: string;
}
export interface NotificationRequest {
  userId: number; notificationType: string; message: string;
}
export interface ApiResponse<T> { success: boolean; message: string; data: T; }

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private base = environment.apiUrl + '/api/notifications';
  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<NotificationResponse[]>> {
    return this.http.get<ApiResponse<NotificationResponse[]>>(this.base);
  }

  getByUserId(userId: number): Observable<ApiResponse<NotificationResponse[]>> {
    return this.http.get<ApiResponse<NotificationResponse[]>>(`${this.base}/user/${userId}`);
  }

  getUnreadByUserId(userId: number): Observable<ApiResponse<NotificationResponse[]>> {
    return this.http.get<ApiResponse<NotificationResponse[]>>(`${this.base}/user/${userId}/unread`);
  }

  markAsRead(id: number): Observable<ApiResponse<NotificationResponse>> {
    return this.http.patch<ApiResponse<NotificationResponse>>(`${this.base}/${id}/read`, {});
  }

  markAllAsRead(userId: number): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.base}/user/${userId}/read-all`, {});
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/${id}`);
  }
}
