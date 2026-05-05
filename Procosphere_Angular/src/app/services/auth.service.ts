import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest {
  firstName: string; lastName: string; email: string; password: string;
  phone?: string; department?: string; company?: string;
  address?: string; avatarUrl?: string;
}
export type Role = 'ADMIN' | 'MANAGER' | 'USER' | 'SUPPLIER';
export interface AuthResponse {
  token: string; tokenType: string; userId: number;
  firstName: string; lastName: string; email: string; role: Role;
  mustChangePassword: boolean;
}
export interface ApiResponse<T> { success: boolean; message: string; data: T; }

export interface PasswordResetRequestResponse {
  id: number; userId: number; userName: string; userEmail: string;
  status: string; createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = environment.apiUrl + '/api/auth';

  constructor(private http: HttpClient) {}

  login(req: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.base}/login`, req).pipe(
      tap(res => {
        if (res.success && res.data) {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('user', JSON.stringify(res.data));
          if (res.data.mustChangePassword) {
            localStorage.setItem('mustChangePassword', 'true');
          }
        }
      })
    );
  }

  register(req: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.base}/register`, req);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('mustChangePassword');
  }

  // --- Forgot Password ---

  forgotPassword(email: string): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.base}/forgot-password`, { email });
  }

  loginByEmail(email: string): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.base}/login-email`, { email }).pipe(
      tap(res => {
        if (res.success && res.data) {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('user', JSON.stringify(res.data));
          localStorage.setItem('mustChangePassword', 'true');
        }
      })
    );
  }

  setNewPassword(newPassword: string): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${this.base}/set-password`, { newPassword }).pipe(
      tap(() => localStorage.removeItem('mustChangePassword'))
    );
  }

  // --- Admin: Password Reset Requests ---

  getResetRequests(): Observable<ApiResponse<PasswordResetRequestResponse[]>> {
    return this.http.get<ApiResponse<PasswordResetRequestResponse[]>>(
      `${this.base}/password-reset-requests`
    );
  }

  getPendingResetRequests(): Observable<ApiResponse<PasswordResetRequestResponse[]>> {
    return this.http.get<ApiResponse<PasswordResetRequestResponse[]>>(
      `${this.base}/password-reset-requests/pending`
    );
  }

  approveResetRequest(id: number): Observable<ApiResponse<null>> {
    return this.http.patch<ApiResponse<null>>(
      `${this.base}/password-reset-requests/${id}/approve`, {}
    );
  }

  rejectResetRequest(id: number): Observable<ApiResponse<null>> {
    return this.http.patch<ApiResponse<null>>(
      `${this.base}/password-reset-requests/${id}/reject`, {}
    );
  }

  // --- Helpers ---

  getToken(): string | null { return localStorage.getItem('token'); }

  isLoggedIn(): boolean { return !!this.getToken(); }

  mustChangePassword(): boolean {
    return localStorage.getItem('mustChangePassword') === 'true';
  }

  getCurrentUser(): AuthResponse | null {
    const u = localStorage.getItem('user');
    if (!u) return null;
    try { return JSON.parse(u); }
    catch { localStorage.removeItem('user'); return null; }
  }

  getCurrentUserId(): number | null {
    return this.getCurrentUser()?.userId ?? null;
  }
}
