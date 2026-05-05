import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ProductService, ProductResponse } from '../../services/product.service';
import { CategoryService, CategoryResponse } from '../../services/category.service';
import { FileService } from '../../services/file.service';

@Component({
  selector: 'app-product-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './product-catalog.component.html',
  styleUrls: ['./product-catalog.component.css'],
})
export class ProductCatalogComponent implements OnInit {
  searchQuery = '';
  selectedCategory = 'All';
  sortBy = 'Name A-Z';
  inStockOnly = false;
  isLoading = true;
  errorMsg = '';

  categories: string[] = ['All'];
  sortOptions = ['Name A-Z', 'Name Z-A', 'Price Low-High', 'Price High-Low', 'Stock Low-High'];

  allProducts: ProductResponse[] = [];

  constructor(
    private productService: ProductService,
    private categoryService: CategoryService,
    private fileService: FileService,
  ) {}

  imageUrl(p: ProductResponse): string { return this.fileService.toAbsoluteUrl(p.imageUrl || ''); }

  ngOnInit() {
    this.categoryService.getAll().subscribe({
      next: (res) => {
        if (res.success) {
          this.categories = ['All', ...res.data.map((c: CategoryResponse) => c.categoryName)];
        }
      },
      error: () => {}
    });
    this.loadProducts();
  }

  loadProducts() {
    this.isLoading = true;
    this.productService.getAll(
      this.searchQuery || undefined,
      undefined,
      this.inStockOnly ? true : undefined
    ).subscribe({
      next: (res) => {
        if (res.success) this.allProducts = res.data;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err?.error?.message || 'Failed to load products. Is the backend running on port 8090?';
      }
    });
  }

  get filteredProducts(): ProductResponse[] {
    return this.allProducts
      .filter(p => {
        const q = (this.searchQuery || '').toLowerCase();
        const matchesSearch = (p.productName || '').toLowerCase().includes(q);
        const matchesCategory = this.selectedCategory === 'All' || p.categoryName === this.selectedCategory;
        const matchesStock = !this.inStockOnly || this.isProductInStock(p);
        return matchesSearch && matchesCategory && matchesStock;
      })
      .sort((a, b) => {
        switch (this.sortBy) {
          case 'Name A-Z': return (a.productName || '').localeCompare(b.productName || '');
          case 'Name Z-A': return (b.productName || '').localeCompare(a.productName || '');
          case 'Price Low-High': return (a.price ?? 0) - (b.price ?? 0);
          case 'Price High-Low': return (b.price ?? 0) - (a.price ?? 0);
          case 'Stock Low-High': return (a.stockQuantity ?? 0) - (b.stockQuantity ?? 0);
          default: return 0;
        }
      });
  }

  isProductInStock(p: ProductResponse): boolean {
    return !!(p.inStock ?? p.isInStock);
  }

  stockBadgeClass(p: ProductResponse): string {
    const stock = p.stockQuantity ?? 0;
    if (!this.isProductInStock(p) || stock === 0) return 'stock-out';
    if (stock <= 10) return 'stock-low';
    return 'stock-in';
  }

  stockLabel(p: ProductResponse): string {
    if (!this.isProductInStock(p) || (p.stockQuantity ?? 0) === 0) return 'Out of Stock';
    if ((p.stockQuantity ?? 0) <= 10) return 'Low Stock';
    return 'In Stock';
  }
}
