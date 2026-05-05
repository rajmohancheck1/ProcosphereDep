import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ApiResponse<T> { success: boolean; message: string; data: T; }

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB — must match backend

@Injectable({ providedIn: 'root' })
export class FileService {
  private base = environment.apiUrl + '/api/files';

  constructor(private http: HttpClient) {}

  /**
   * Upload a product image. Returns the absolute URL to use in <img src>.
   * The backend returns a path-only URL like "/uploads/products/xyz.png";
   * we prefix it with the API origin so it works regardless of where Angular runs.
   */
  uploadProductImage(file: File): Observable<string> {
    this.validate(file);
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<ApiResponse<{ url: string }>>(`${this.base}/products`, formData)
      .pipe(map(res => this.toAbsoluteUrl(res.data.url)));
  }

  /** Convert a relative "/uploads/..." path into a fully-qualified URL. */
  toAbsoluteUrl(url: string): string {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url; // already absolute
    return environment.apiUrl + (url.startsWith('/') ? url : '/' + url);
  }

  /** Throws an Error if file violates size/type constraints. */
  validate(file: File): void {
    if (!file) throw new Error('No file selected.');
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 5 MB.`);
    }
    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Unsupported image type. Use JPG, PNG, GIF, WebP, or SVG.');
    }
  }
}
