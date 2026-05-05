import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductService, ProductResponse } from '../../services/product.service';
import { OrderService, OrderResponse } from '../../services/order.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.css'],
})
export class UserDashboardComponent implements OnInit {
  products: ProductResponse[] = [];
  orders: OrderResponse[] = [];
  unreadCount = 0;
  isLoading = true;
  errorMsg = '';

  constructor(
    private productService: ProductService,
    private orderService: OrderService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    const userId = this.authService.getCurrentUserId();
    forkJoin({
      products: this.productService.getAll(),
      orders: this.orderService.getAll(),
      notifs: userId ? this.notificationService.getUnreadByUserId(userId) : this.notificationService.getAll(),
    }).subscribe({
      next: (res) => {
        if (res.products.success) this.products = res.products.data;
        if (res.orders.success) this.orders = res.orders.data;
        if (res.notifs.success) {
          this.unreadCount = userId
            ? res.notifs.data.length
            : res.notifs.data.filter((n: any) => !(n.read ?? n.isRead)).length;
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err?.error?.message || 'Failed to load dashboard.';
      }
    });
  }

  get firstName(): string { return this.authService.getCurrentUser()?.firstName || 'User'; }
  get today(): string { return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
  get productCount(): number { return this.products.length; }
  get myOrderCount(): number {
    const uid = this.authService.getCurrentUserId();
    return this.orders.filter(o => o.createdBy === uid).length;
  }
  get recentProducts(): ProductResponse[] { return this.products.slice(0, 6); }
  isInStock(p: ProductResponse): boolean { return !!((p as any).inStock ?? (p as any).isInStock); }
  navigateTo(path: string) { this.router.navigate([path]); }
}
