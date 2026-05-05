import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ProductService, ProductResponse, ProductRequest } from '../../services/product.service';
import { CategoryService, CategoryResponse } from '../../services/category.service';
import { AuthService } from '../../services/auth.service';
import { FileService } from '../../services/file.service';
import { ImageUploadComponent } from '../../components/image-upload/image-upload.component';

@Component({
  selector: 'app-my-products',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageUploadComponent],
  templateUrl: './my-products.component.html',
  styleUrls: ['./my-products.component.css'],
})
export class MyProductsComponent implements OnInit {
  products: ProductResponse[] = [];
  categories: CategoryResponse[] = [];
  isLoading = true;
  errorMsg = '';
  successMsg = '';
  busy = false;

  // Modal state
  showModal = false;
  editingId: number | null = null;
  form: ProductRequest = {
    productName: '', categoryId: 0, price: 0, description: '',
    stockQuantity: 0, isInStock: true, imageUrl: '', supplierId: undefined,
  };

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private authService: AuthService,
    private fileService: FileService,
    private router: Router,
  ) {}

  /** Helper for the table — resolves "/uploads/..." paths to absolute URLs. */
  imageUrl(p: ProductResponse): string { return this.fileService.toAbsoluteUrl(p.imageUrl || ''); }

  ngOnInit() { this.load(); }

  load() {
    this.isLoading = true;
    forkJoin({
      products: this.productService.getAll(),
      categories: this.categoryService.getAll(),
    }).subscribe({
      next: (res) => {
        const myId = this.authService.getCurrentUserId();
        if (res.products.success) {
          // Show products owned by this supplier. New suppliers see empty list.
          this.products = res.products.data.filter(p => p.supplierId === myId);
        }
        if (res.categories.success) this.categories = res.categories.data;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err?.error?.message || 'Failed to load products.';
      }
    });
  }

  private emptyForm(): ProductRequest {
    const myId = this.authService.getCurrentUserId() ?? undefined;
    return {
      productName: '',
      categoryId: this.categories[0]?.categoryId ?? 0,
      price: 0,
      description: '',
      stockQuantity: 0,
      isInStock: true,
      imageUrl: '',
      supplierId: myId ? Number(myId) : undefined,
    };
  }

  isInStock(p: ProductResponse): boolean {
    return !!((p as any).inStock ?? (p as any).isInStock);
  }

  openCreate() {
    this.editingId = null;
    this.form = this.emptyForm();
    this.showModal = true;
    this.errorMsg = '';
  }

  openEdit(p: ProductResponse) {
    this.editingId = p.productId;
    this.form = {
      productName: p.productName,
      categoryId: p.categoryId,
      price: p.price ?? 0,
      description: p.description,
      stockQuantity: p.stockQuantity ?? 0,
      isInStock: this.isInStock(p),
      imageUrl: p.imageUrl,
      supplierId: p.supplierId ?? undefined,
    };
    this.showModal = true;
    this.errorMsg = '';
  }

  closeModal() { this.showModal = false; this.editingId = null; }

  save() {
    if (!this.form.productName) { this.errorMsg = 'Product name is required.'; return; }
    if (!this.form.categoryId) { this.errorMsg = 'Please select a category.'; return; }
    if (this.form.price === null || this.form.price === undefined || this.form.price < 0) {
      this.errorMsg = 'Please enter a valid price.'; return;
    }

    // Always force supplierId to current user for new products.
    if (!this.editingId) {
      this.form.supplierId = (this.authService.getCurrentUserId() ?? undefined) as any;
    }

    this.busy = true;
    const obs$ = this.editingId
      ? this.productService.update(this.editingId, this.form)
      : this.productService.create(this.form);

    obs$.subscribe({
      next: (res) => {
        this.busy = false;
        if (res.success && res.data) {
          if (this.editingId) {
            this.products = this.products.map(p => p.productId === res.data.productId ? res.data : p);
            this.flashSuccess('Product updated.');
          } else {
            this.products = [res.data, ...this.products];
            this.flashSuccess('Product created.');
          }
          this.closeModal();
        }
      },
      error: (err) => {
        this.busy = false;
        this.errorMsg = err?.error?.message || 'Save failed.';
      }
    });
  }

  remove(p: ProductResponse) {
    if (!confirm(`Delete "${p.productName}"? This cannot be undone.`)) return;
    this.productService.delete(p.productId).subscribe({
      next: () => {
        this.products = this.products.filter(x => x.productId !== p.productId);
        this.flashSuccess('Product deleted.');
      },
      error: (err) => { this.errorMsg = err?.error?.message || 'Delete failed.'; }
    });
  }

  viewProduct(p: ProductResponse) { this.router.navigate(['/app/products', p.productId]); }

  private flashSuccess(msg: string) { this.successMsg = msg; setTimeout(() => this.successMsg = '', 3000); }

  get totalStock(): number { return this.products.reduce((s, p) => s + (p.stockQuantity ?? 0), 0); }
  get inStockCount(): number { return this.products.filter(p => this.isInStock(p)).length; }
  get outOfStockCount(): number { return this.products.filter(p => !this.isInStock(p)).length; }
}
