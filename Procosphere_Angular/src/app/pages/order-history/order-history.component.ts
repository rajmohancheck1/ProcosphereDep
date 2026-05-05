import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OrderService, OrderResponse } from '../../services/order.service';

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './order-history.component.html',
  styleUrls: ['./order-history.component.css'],
})
export class OrderHistoryComponent implements OnInit {
  searchQuery = '';
  selectedStatus = 'All';
  startDate = '';
  endDate = '';
  /** Today, used as max for the date filters so users can't pick a future date by mistake. */
  todayIso = new Date().toISOString().split('T')[0];
  currentPage = 1;
  itemsPerPage = 5;
  isLoading = true;
  errorMsg = '';

  statuses = ['All', 'DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'ORDERED', 'RECEIVED', 'CANCELLED'];

  statusColors: Record<string, string> = {
    DRAFT:     'status-draft',
    PENDING:   'status-pending',
    APPROVED:  'status-approved',
    REJECTED:  'status-rejected',
    ORDERED:   'status-ordered',
    RECEIVED:  'status-received',
    CANCELLED: 'status-cancelled',
  };

  statusProgress: Record<string, number> = {
    DRAFT: 10, PENDING: 25, APPROVED: 50, ORDERED: 75, RECEIVED: 100,
    REJECTED: 0, CANCELLED: 0,
  };

  orders: OrderResponse[] = [];

  constructor(private orderService: OrderService) {}

  ngOnInit() {
    this.orderService.getAll().subscribe({
      next: (res) => {
        if (res.success) this.orders = res.data;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err?.error?.message || 'Failed to load orders. Is the backend running on port 8090?';
      }
    });
  }

  getOrderProducts(order: OrderResponse): string {
    return order.items?.map(i => i.productName).join(', ') || '—';
  }

  getOrderDate(order: OrderResponse): string {
    return order.createdAt ? order.createdAt.split('T')[0] : '—';
  }

  get filteredOrders(): OrderResponse[] {
    return this.orders.filter(o => {
      const q = (this.searchQuery || '').toLowerCase();
      const matchesSearch =
        ('ord-' + o.orderId).includes(q) ||
        (o.orderTitle || '').toLowerCase().includes(q);
      const matchesStatus = this.selectedStatus === 'All' || o.status === this.selectedStatus;
      let matchesDate = true;
      if (this.startDate && this.endDate && o.createdAt) {
        const d = new Date(o.createdAt);
        matchesDate = d >= new Date(this.startDate) && d <= new Date(this.endDate);
      }
      return matchesSearch && matchesStatus && matchesDate;
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredOrders.length / this.itemsPerPage));
  }

  get paginatedOrders(): OrderResponse[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredOrders.slice(start, start + this.itemsPerPage);
  }

  resetFilters() {
    this.searchQuery = '';
    this.selectedStatus = 'All';
    this.startDate = '';
    this.endDate = '';
    this.currentPage = 1;
  }

  prevPage() { if (this.currentPage > 1) this.currentPage--; }
  nextPage() { if (this.currentPage < this.totalPages) this.currentPage++; }
}
