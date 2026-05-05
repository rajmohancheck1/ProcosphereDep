import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { OrderService, OrderResponse } from '../../services/order.service';
import { ProductService, ProductResponse } from '../../services/product.service';
import { DashboardService, DashboardSummaryResponse } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';

type Tab = 'approvals' | 'cancellations' | 'stock' | 'suppliers';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './manager-dashboard.component.html',
  styleUrls: ['./manager-dashboard.component.css'],
})
export class ManagerDashboardComponent implements OnInit {
  activeTab: Tab = 'approvals';

  orders: OrderResponse[] = [];
  products: ProductResponse[] = [];
  summary: DashboardSummaryResponse | null = null;

  selectedIds = new Set<number>();
  isLoading = true;
  errorMsg = '';
  successMsg = '';
  busyId: number | null = null;
  bulkBusy = false;

  priorityColor: Record<string, string> = {
    LOW: 'priority-low', MEDIUM: 'priority-medium',
    HIGH: 'priority-high', URGENT: 'priority-urgent',
  };

  constructor(
    private orderService: OrderService,
    private productService: ProductService,
    private dashboardService: DashboardService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.isLoading = true;
    this.errorMsg = '';
    forkJoin({
      orders: this.orderService.getAll(),
      products: this.productService.getAll(),
      summary: this.dashboardService.getSummary(),
    }).subscribe({
      next: (res) => {
        if (res.orders.success) this.orders = res.orders.data;
        if (res.products.success) this.products = res.products.data;
        if (res.summary.success) this.summary = res.summary.data;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err?.error?.message || 'Failed to load dashboard data.';
      }
    });
  }

  get firstName(): string { return this.authService.getCurrentUser()?.firstName || 'Manager'; }
  get today(): string {
    return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  get pendingOrders(): OrderResponse[] {
    return this.orders.filter(o => o.status === 'PENDING');
  }
  get cancelRequestedOrders(): OrderResponse[] {
    return this.orders.filter(o => o.status === 'CANCEL_REQUESTED');
  }
  get pendingCount(): number { return this.pendingOrders.length; }
  get cancelRequestCount(): number { return this.cancelRequestedOrders.length; }

  get approvedThisWeek(): number {
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    return this.orders.filter(o =>
      o.status === 'APPROVED' && o.createdAt && new Date(o.createdAt).getTime() > weekAgo
    ).length;
  }

  get totalPOValue(): number {
    return this.orders.filter(o => o.status === 'APPROVED')
      .reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);
  }

  get totalPOFormatted(): string {
    const v = this.totalPOValue;
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000)   return `₹${(v / 1000).toFixed(1)}K`;
    return `₹${v.toFixed(0)}`;
  }

  get criticalStockCount(): number {
    return this.products.filter(p =>
      !((p as any).inStock ?? (p as any).isInStock) || (p.stockQuantity ?? 0) === 0
    ).length;
  }
  get lowStockCount(): number {
    return this.products.filter(p =>
      (p.stockQuantity ?? 0) > 0 && (p.stockQuantity ?? 0) <= 10
    ).length;
  }
  get stockAlertCount(): number { return this.criticalStockCount + this.lowStockCount; }

  get lowStockProducts(): ProductResponse[] {
    return this.products
      .filter(p => (p.stockQuantity ?? 0) <= 10)
      .sort((a, b) => (a.stockQuantity ?? 0) - (b.stockQuantity ?? 0));
  }

  // Selection (for pending approvals bulk actions)
  toggleSelect(id: number) {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
  }
  isSelected(id: number): boolean { return this.selectedIds.has(id); }
  toggleSelectAll() {
    if (this.allSelected) this.selectedIds.clear();
    else this.pendingOrders.forEach(o => this.selectedIds.add(o.orderId));
  }
  get allSelected(): boolean {
    return this.pendingOrders.length > 0 &&
           this.pendingOrders.every(o => this.selectedIds.has(o.orderId));
  }

  // Order approval actions
  approve(id: number) {
    this.busyId = id;
    this.orderService.approve(id).subscribe({
      next: (res) => {
        this.busyId = null;
        if (res.success) {
          this.orders = this.orders.map(o => o.orderId === id ? res.data : o);
          this.selectedIds.delete(id);
          this.flashSuccess(`Order #ORD-${id} approved.`);
        }
      },
      error: (err) => {
        this.busyId = null;
        this.flashError(err?.error?.message || 'Failed to approve order.');
      }
    });
  }

  reject(id: number) {
    if (!confirm(`Reject order #ORD-${id}?`)) return;
    this.busyId = id;
    this.orderService.reject(id).subscribe({
      next: (res) => {
        this.busyId = null;
        if (res.success) {
          this.orders = this.orders.map(o => o.orderId === id ? res.data : o);
          this.selectedIds.delete(id);
          this.flashSuccess(`Order #ORD-${id} rejected.`);
        }
      },
      error: (err) => {
        this.busyId = null;
        this.flashError(err?.error?.message || 'Failed to reject order.');
      }
    });
  }

  // Cancellation approval actions
  approveCancellation(id: number) {
    if (!confirm(`Approve cancellation for order #ORD-${id}? Stock will be restored.`)) return;
    this.busyId = id;
    this.orderService.approveCancellation(id).subscribe({
      next: (res) => {
        this.busyId = null;
        if (res.success) {
          this.orders = this.orders.map(o => o.orderId === id ? res.data : o);
          this.flashSuccess(`Cancellation approved for #ORD-${id}. Order cancelled and stock restored.`);
        }
      },
      error: (err) => {
        this.busyId = null;
        this.flashError(err?.error?.message || 'Failed to approve cancellation.');
      }
    });
  }

  rejectCancellation(id: number) {
    if (!confirm(`Reject cancellation request for order #ORD-${id}? The order will continue.`)) return;
    this.busyId = id;
    this.orderService.rejectCancellation(id).subscribe({
      next: (res) => {
        this.busyId = null;
        if (res.success) {
          this.orders = this.orders.map(o => o.orderId === id ? res.data : o);
          this.flashSuccess(`Cancellation rejected for #ORD-${id}. Order restored to previous status.`);
        }
      },
      error: (err) => {
        this.busyId = null;
        this.flashError(err?.error?.message || 'Failed to reject cancellation.');
      }
    });
  }

  bulkApprove() {
    const ids = Array.from(this.selectedIds);
    if (!ids.length) return;
    if (!confirm(`Approve ${ids.length} selected order(s)?`)) return;
    this.bulkBusy = true;
    let done = 0;
    ids.forEach(id => {
      this.orderService.approve(id).subscribe({
        next: (res) => {
          if (res.success) this.orders = this.orders.map(o => o.orderId === id ? res.data : o);
          if (++done === ids.length) this.finishBulk(ids.length, 'approved');
        },
        error: () => { if (++done === ids.length) this.finishBulk(ids.length, 'approved'); }
      });
    });
  }

  bulkReject() {
    const ids = Array.from(this.selectedIds);
    if (!ids.length) return;
    if (!confirm(`Reject ${ids.length} selected order(s)?`)) return;
    this.bulkBusy = true;
    let done = 0;
    ids.forEach(id => {
      this.orderService.reject(id).subscribe({
        next: (res) => {
          if (res.success) this.orders = this.orders.map(o => o.orderId === id ? res.data : o);
          if (++done === ids.length) this.finishBulk(ids.length, 'rejected');
        },
        error: () => { if (++done === ids.length) this.finishBulk(ids.length, 'rejected'); }
      });
    });
  }

  private finishBulk(count: number, verb: string) {
    this.bulkBusy = false;
    this.selectedIds.clear();
    this.flashSuccess(`${count} order(s) ${verb}.`);
  }

  riskLabel(o: OrderResponse): { label: string; cls: string } {
    const amt = o.totalAmount ?? 0;
    if (amt >= 100000) return { label: 'High', cls: 'risk-high' };
    if (amt >= 30000)  return { label: 'Med',  cls: 'risk-medium' };
    return                     { label: 'Low',  cls: 'risk-low' };
  }

  getItems(o: OrderResponse): string {
    return o.items?.map(i => `${i.productName} x${i.quantity}`).join(', ') || '—';
  }
  getDate(o: OrderResponse): string {
    return o.createdAt
      ? new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '—';
  }
  getAmount(amt: number | null): string { return '₹' + (amt ?? 0).toLocaleString(); }
  getSupplierName(o: OrderResponse): string {
    return o.supplierName || ('Supplier #' + o.supplierId);
  }

  stockSeverity(p: ProductResponse): { label: string; cls: string } {
    const q = p.stockQuantity ?? 0;
    if (q === 0 || q <= 5) return { label: 'Critical', cls: 'severity-critical' };
    return                        { label: 'Low',       cls: 'severity-low-stock' };
  }

  stockBarPercent(p: ProductResponse): number {
    return Math.min(100, Math.round(((p.stockQuantity ?? 0) / 25) * 100));
  }

  stockBarClass(p: ProductResponse): string {
    const q = p.stockQuantity ?? 0;
    if (q === 0 || q <= 5) return 'stock-bar-red';
    if (q <= 10)           return 'stock-bar-yellow';
    return 'stock-bar-green';
  }

  get stockOverviewData(): { label: string; count: number; percent: number; barClass: string }[] {
    const total = this.products.length || 1;
    const out      = this.products.filter(p => (p.stockQuantity ?? 0) === 0).length;
    const critical = this.products.filter(p => { const q = p.stockQuantity ?? 0; return q > 0 && q <= 5; }).length;
    const low      = this.products.filter(p => { const q = p.stockQuantity ?? 0; return q > 5 && q <= 10; }).length;
    const healthy  = this.products.filter(p => (p.stockQuantity ?? 0) > 10).length;
    return [
      { label: 'Healthy (>10)',    count: healthy,  percent: Math.round((healthy  / total) * 100), barClass: 'bar-green' },
      { label: 'Low (6–10)',       count: low,      percent: Math.round((low      / total) * 100), barClass: 'bar-yellow' },
      { label: 'Critical (1–5)',   count: critical, percent: Math.round((critical / total) * 100), barClass: 'bar-red'   },
      { label: 'Out of Stock (0)', count: out,      percent: Math.round((out      / total) * 100), barClass: 'bar-dark'  },
    ];
  }

  createReorder(p: ProductResponse) {
    this.router.navigate(['/app/create-order'], { queryParams: { productId: p.productId } });
  }

  private flashSuccess(msg: string) { this.successMsg = msg; setTimeout(() => this.successMsg = '', 3500); }
  private flashError(msg: string)   { this.errorMsg   = msg; setTimeout(() => this.errorMsg   = '', 4000); }

  navigateTo(path: string) { this.router.navigate([path]); }
}
