import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { OrderService, OrderResponse } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { DeliveryService } from '../../services/delivery.service';

@Component({
  selector: 'app-supplier-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './supplier-dashboard.component.html',
  styleUrls: ['./supplier-dashboard.component.css'],
})
export class SupplierDashboardComponent implements OnInit {
  orders: OrderResponse[] = [];
  isLoading = true;
  errorMsg = '';

  statusColors: Record<string, string> = {
    DRAFT:     'status-draft',
    PENDING:   'status-pending',
    APPROVED:  'status-approved',
    REJECTED:  'status-rejected',
    ORDERED:   'status-ordered',
    RECEIVED:  'status-received',
    CANCELLED: 'status-cancelled',
    SHIPPED:   'status-ordered',
    DELIVERED: 'status-received',
    RETURNED:  'status-returned',
  };
  statusProgress: Record<string, number> = {
    DRAFT: 10, PENDING: 25, APPROVED: 50, ORDERED: 75, RECEIVED: 100,
    REJECTED: 0, CANCELLED: 0, SHIPPED: 75, DELIVERED: 100, RETURNED: 0,
  };
  progressColor: Record<string, string> = {
    DRAFT:     'prog-draft',
    PENDING:   'prog-pending',
    APPROVED:  'prog-approved',
    ORDERED:   'prog-ordered',
    RECEIVED:  'prog-received',
    REJECTED:  'prog-rejected',
    CANCELLED: 'prog-cancelled',
    SHIPPED:   'prog-ordered',
    DELIVERED: 'prog-received',
    RETURNED:  'prog-rejected',
  };

  constructor(
    private orderService: OrderService,
    private authService: AuthService,
    private deliveryService: DeliveryService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.orderService.getAll().subscribe({
      next: (res) => {
        if (res.success) this.orders = res.data;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err?.error?.message || 'Failed to load orders.';
      }
    });
  }

  get firstName(): string { return this.authService.getCurrentUser()?.firstName || 'User'; }
  get today(): string { return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }

  get totalOrders(): number { return this.orders.length; }
  get pendingCount(): number { return this.orders.filter(o => o.status === 'PENDING').length; }
  get approvedCount(): number { return this.orders.filter(o => o.status === 'APPROVED' || o.status === 'ORDERED' || o.status === 'RECEIVED').length; }
  get completionRate(): number {
    if (!this.orders.length) return 0;
    const completed = this.orders.filter(o => o.status === 'RECEIVED').length;
    return Math.round((completed / this.orders.length) * 100);
  }

  get recentOrders(): OrderResponse[] { return this.orders.slice(0, 5); }

  getProducts(o: OrderResponse): string {
    return o.items?.map(i => `${i.productName} x${i.quantity}`).slice(0, 2).join(', ') || '—';
  }
  getDate(o: OrderResponse): string {
    return o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
  }
  getAmount(o: OrderResponse): string {
    return '₹' + (o.totalAmount ?? 0).toLocaleString();
  }

  navigateTo(path: string) { this.router.navigate([path]); }
}
