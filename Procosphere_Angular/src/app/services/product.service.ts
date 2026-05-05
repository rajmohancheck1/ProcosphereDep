import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProductResponse {
  productId: number; supplierId: number; supplierName?: string | null;
  categoryId: number; categoryName: string;
  productName: string; description: string;
  price: number | null;
  stockQuantity: number | null;
  inStock?: boolean;     // Jackson strips "is" from Lombok getter isInStock() → "inStock"
  isInStock?: boolean;   // kept as alias; one of these will be populated
  imageUrl: string;
}
export interface ProductRequest {
  supplierId?: number; categoryId: number; productName: string;
  description?: string; price: number; stockQuantity?: number;
  isInStock?: boolean; imageUrl?: string;
}
export interface ApiResponse<T> { success: boolean; message: string; data: T; }

@Injectable({ providedIn: 'root' })
export class ProductService {
  private base = environment.apiUrl + '/api/products';

  constructor(private http: HttpClient) {}

  getAll(search?: string, categoryId?: number, isInStock?: boolean): Observable<ApiResponse<ProductResponse[]>> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (categoryId !== undefined) params = params.set('categoryId', categoryId.toString());
    if (isInStock !== undefined) params = params.set('isInStock', isInStock.toString());
    return this.http.get<ApiResponse<ProductResponse[]>>(this.base, { params });
  }

  getById(id: number): Observable<ApiResponse<ProductResponse>> {
    return this.http.get<ApiResponse<ProductResponse>>(`${this.base}/${id}`);
  }

  create(req: ProductRequest): Observable<ApiResponse<ProductResponse>> {
    return this.http.post<ApiResponse<ProductResponse>>(this.base, req);
  }

  update(id: number, req: ProductRequest): Observable<ApiResponse<ProductResponse>> {
    return this.http.put<ApiResponse<ProductResponse>>(`${this.base}/${id}`, req);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/${id}`);
  }
}
