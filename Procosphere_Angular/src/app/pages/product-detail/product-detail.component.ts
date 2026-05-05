import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService, ProductResponse, ProductRequest } from '../../services/product.service';
import { CategoryService, CategoryResponse } from '../../services/category.service';
import { AuthService, Role } from '../../services/auth.service';
import { FileService } from '../../services/file.service';
import { ImageUploadComponent } from '../../components/image-upload/image-upload.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageUploadComponent],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css'],
})
export class ProductDetailComponent implements OnInit {
  product: ProductResponse | null = null;
  categories: CategoryResponse[] = [];
  isLoading = true;
  errorMsg = '';
  successMsg = '';
  isEditing = false;
  isSaving = false;

  editForm: ProductRequest = {
    productName: '', categoryId: 0, price: 0, description: '',
    stockQuantity: 0, isInStock: true, imageUrl: '', supplierId: undefined,
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private categoryService: CategoryService,
    private authService: AuthService,
    private fileService: FileService,
  ) {}

  /** Resolves "/uploads/..." image paths to absolute URLs for <img> tags. */
  get displayImageUrl(): string { return this.fileService.toAbsoluteUrl(this.product?.imageUrl || ''); }

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : NaN;
    if (!id) { this.errorMsg = 'Invalid product id'; this.isLoading = false; return; }

    this.categoryService.getAll().subscribe({
      next: (res) => { if (res.success) this.categories = res.data; },
      error: () => {}
    });

    this.productService.getById(id).subscribe({
      next: (res) => {
        if (res.success) this.product = res.data;
        else this.errorMsg = res.message || 'Product not found.';
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err?.status === 404 ? 'Product not found.' : (err?.error?.message || 'Failed to load product.');
      }
    });
  }

  get role(): Role { return (this.authService.getCurrentUser()?.role as Role) || 'USER'; }
  get currentUserId(): number | null { return this.authService.getCurrentUserId(); }

  /** Admin can edit any product. Supplier can edit only products they own (supplierId === their userId). */
  get canEdit(): boolean {
    if (!this.product) return false;
    if (this.role === 'ADMIN') return true;
    if (this.role === 'SUPPLIER' && this.product.supplierId === this.currentUserId) return true;
    return false;
  }

  get canDelete(): boolean { return this.role === 'ADMIN'; }
  get canOrder(): boolean { return this.role === 'USER' || this.role === 'SUPPLIER'; }

  isInStock(p: ProductResponse): boolean {
    return !!((p as any).inStock ?? (p as any).isInStock);
  }

  startEdit() {
    if (!this.product) return;
    this.editForm = {
      productName: this.product.productName,
      categoryId: this.product.categoryId,
      price: this.product.price ?? 0,
      description: this.product.description,
      stockQuantity: this.product.stockQuantity ?? 0,
      isInStock: this.isInStock(this.product),
      imageUrl: this.product.imageUrl,
      supplierId: this.product.supplierId,
    };
    this.isEditing = true;
  }

  cancelEdit() { this.isEditing = false; this.errorMsg = ''; }

  saveEdit() {
    if (!this.product) return;
    if (!this.editForm.productName || this.editForm.price === null || this.editForm.price === undefined) {
      this.errorMsg = 'Name and price are required.';
      return;
    }
    this.isSaving = true;
    this.productService.update(this.product.productId, this.editForm).subscribe({
      next: (res) => {
        this.isSaving = false;
        if (res.success) {
          this.product = res.data;
          this.isEditing = false;
          this.successMsg = 'Product updated.';
          setTimeout(() => (this.successMsg = ''), 3000);
        } else {
          this.errorMsg = res.message || 'Update failed.';
        }
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMsg = err?.error?.message || 'Update failed.';
      }
    });
  }

  deleteProduct() {
    if (!this.product) return;
    if (!confirm(`Permanently delete "${this.product.productName}"?`)) return;
    this.productService.delete(this.product.productId).subscribe({
      next: () => { this.router.navigate(['/app/products']); },
      error: (err) => {
        this.errorMsg = err?.error?.message || 'Delete failed.';
      }
    });
  }

  goBack() { history.length > 1 ? history.back() : this.router.navigate(['/app/products']); }

  addToOrder() {
    if (!this.product) return;
    this.router.navigate(['/app/create-order'], { queryParams: { productId: this.product.productId } });
  }
}
