import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService, OrderResponse } from '../../services/order.service';
import { DeliveryService, DeliveryResponse, DELIVERY_STATUSES } from '../../services/delivery.service';
import { AuthService, Role } from '../../services/auth.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.css'],
})
export class OrderDetailComponent implements OnInit {
  order: OrderResponse | null = null;
  deliveries: DeliveryResponse[] = [];
  isLoading = true;
  errorMsg = '';
  successMsg = '';
  busy = false;

  showDeliveryModal = false;
  editingDelivery: DeliveryResponse | null = null;
  deliveryForm = { trackingNumber: '', status: 'PENDING' };
  deliveryStatuses = [...DELIVERY_STATUSES];

  statusColors: Record<string, string> = {
    DRAFT:            'status-draft',
    PENDING:          'status-pending',
    APPROVED:         'status-approved',
    REJECTED:         'status-rejected',
    ORDERED:          'status-ordered',
    RECEIVED:         'status-received',
    RETURNED:         'status-returned',
    CANCELLED:        'status-cancelled',
    CANCEL_REQUESTED: 'status-pending',
  };

  deliveryStatusColors: Record<string, string> = {
    PENDING:          'delivery-pending',
    SHIPPED:          'delivery-shipped',
    IN_TRANSIT:       'delivery-in-transit',
    OUT_FOR_DELIVERY: 'delivery-out-for-delivery',
    DELIVERED:        'delivery-delivered',
    RETURNED:         'delivery-returned',
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private deliveryService: DeliveryService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.errorMsg = 'Invalid order id'; this.isLoading = false; return; }
    this.loadAll(id);
  }

  loadAll(id: number) {
    this.isLoading = true;
    forkJoin({
      order: this.orderService.getById(id),
      deliveries: this.deliveryService.getByOrderId(id),
    }).subscribe({
      next: (res) => {
        if (res.order.success) this.order = res.order.data;
        if (res.deliveries.success) this.deliveries = res.deliveries.data;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err?.status === 404 ? 'Order not found.' : (err?.error?.message || 'Failed to load order.');
      }
    });
  }

  // ---- Role / permission checks ----
  get role(): Role { return (this.authService.getCurrentUser()?.role as Role) || 'USER'; }
  get currentUserId(): number | null { return this.authService.getCurrentUserId(); }
  get isOwner(): boolean { return !!this.order && this.order.createdBy === this.currentUserId; }
  get isManagerOrAdmin(): boolean { return this.role === 'ADMIN' || this.role === 'MANAGER'; }
  get isSupplierOrAdmin(): boolean { return this.role === 'ADMIN' || this.role === 'SUPPLIER'; }

  // Manager/Admin: approve/reject normal pending orders
  get canApprove(): boolean { return this.isManagerOrAdmin && this.order?.status === 'PENDING'; }
  get canReject():  boolean { return this.isManagerOrAdmin && this.order?.status === 'PENDING'; }

  // Supplier/Admin: advance order through supply chain states
  get canMarkOrdered():  boolean { return this.isSupplierOrAdmin && this.order?.status === 'APPROVED'; }
  get canMarkReceived(): boolean { return this.isSupplierOrAdmin && this.order?.status === 'ORDERED'; }
  get canMarkReturned(): boolean { return this.isSupplierOrAdmin && this.order?.status === 'RECEIVED'; }

  // User: request cancellation before order is received
  get canRequestCancel(): boolean {
    if (!this.order || !this.isOwner) return false;
    return ['PENDING', 'APPROVED', 'ORDERED'].includes(this.order.status);
  }

  // Manager/Admin: approve or reject user cancellation requests
  get canApproveCancellation(): boolean {
    return this.isManagerOrAdmin && this.order?.status === 'CANCEL_REQUESTED';
  }
  get canRejectCancellation(): boolean {
    return this.isManagerOrAdmin && this.order?.status === 'CANCEL_REQUESTED';
  }

  get canDelete(): boolean { return this.role === 'ADMIN'; }

  // Delivery records: Supplier and Admin only (not Manager)
  get canManageDeliveries(): boolean { return this.isSupplierOrAdmin; }

  // ---- Status actions ----
  changeStatus(newStatus: string, confirmMsg?: string) {
    if (!this.order) return;
    if (confirmMsg && !confirm(confirmMsg)) return;
    this.busy = true;
    this.errorMsg = '';
    this.orderService.updateStatus(this.order.orderId, newStatus).subscribe({
      next: (res) => {
        this.busy = false;
        if (res.success) {
          this.order = res.data;
          this.flashSuccess(`Status updated to ${newStatus}.`);
        }
      },
      error: (err) => {
        this.busy = false;
        this.errorMsg = err?.error?.message || 'Failed to update status.';
      }
    });
  }

  approve() { this.orderService.approve(this.order!.orderId).subscribe({ next: res => { this.order = res.data; this.flashSuccess('Order approved.'); }, error: err => { this.errorMsg = err?.error?.message || 'Failed to approve.'; } }); }
  reject()  { if (!confirm('Reject this order?')) return; this.orderService.reject(this.order!.orderId).subscribe({ next: res => { this.order = res.data; this.flashSuccess('Order rejected.'); }, error: err => { this.errorMsg = err?.error?.message || 'Failed to reject.'; } }); }

  markOrdered()  { this.changeStatus('ORDERED'); }
  markReceived() { this.changeStatus('RECEIVED', 'Mark this order as received?'); }
  markReturned() { this.changeStatus('RETURNED', 'Mark this order as returned?'); }

  requestCancel() {
    if (!this.order) return;
    if (!confirm('Request cancellation? A manager must approve before the order is cancelled.')) return;
    this.busy = true;
    this.orderService.requestCancellation(this.order.orderId).subscribe({
      next: (res) => {
        this.busy = false;
        if (res.success) {
          this.order = res.data;
          this.flashSuccess('Cancellation request submitted. Awaiting manager approval.');
        }
      },
      error: (err) => {
        this.busy = false;
        this.errorMsg = err?.error?.message || 'Failed to request cancellation.';
      }
    });
  }

  approveCancellation() {
    if (!this.order) return;
    if (!confirm('Approve this cancellation? Stock will be restored.')) return;
    this.busy = true;
    this.orderService.approveCancellation(this.order.orderId).subscribe({
      next: (res) => {
        this.busy = false;
        if (res.success) {
          this.order = res.data;
          this.flashSuccess('Cancellation approved. Order cancelled and stock restored.');
        }
      },
      error: (err) => {
        this.busy = false;
        this.errorMsg = err?.error?.message || 'Failed to approve cancellation.';
      }
    });
  }

  rejectCancellation() {
    if (!this.order) return;
    if (!confirm('Reject this cancellation request? The order will continue.')) return;
    this.busy = true;
    this.orderService.rejectCancellation(this.order.orderId).subscribe({
      next: (res) => {
        this.busy = false;
        if (res.success) {
          this.order = res.data;
          this.flashSuccess('Cancellation rejected. Order restored to previous status.');
        }
      },
      error: (err) => {
        this.busy = false;
        this.errorMsg = err?.error?.message || 'Failed to reject cancellation.';
      }
    });
  }

  deleteOrder() {
    if (!this.order) return;
    if (!confirm(`Permanently delete order #ORD-${this.order.orderId}?`)) return;
    this.orderService.delete(this.order.orderId).subscribe({
      next: () => this.router.navigate(['/app/orders']),
      error: (err: any) => { this.errorMsg = err?.error?.message || 'Failed to delete order.'; }
    });
  }

  // ---- Delivery actions ----
  openCreateDelivery() {
    this.editingDelivery = null;
    this.deliveryForm = { trackingNumber: '', status: 'PENDING' };
    this.showDeliveryModal = true;
  }

  openEditDelivery(d: DeliveryResponse) {
    this.editingDelivery = d;
    this.deliveryForm = { trackingNumber: d.trackingNumber || '', status: d.status || 'PENDING' };
    this.showDeliveryModal = true;
  }

  closeDeliveryModal() { this.showDeliveryModal = false; this.editingDelivery = null; }

  saveDelivery() {
    if (!this.order) return;
    const now = new Date().toISOString();
    const payload = {
      orderId: this.order.orderId,
      trackingNumber: this.deliveryForm.trackingNumber || undefined,
      status: this.deliveryForm.status,
      shippedDate: ['SHIPPED','IN_TRANSIT','OUT_FOR_DELIVERY'].includes(this.deliveryForm.status) ? now : undefined,
      deliveredDate: this.deliveryForm.status === 'DELIVERED' ? now : undefined,
    };
    this.busy = true;
    const obs$ = this.editingDelivery
      ? this.deliveryService.update(this.editingDelivery.deliveryId, payload)
      : this.deliveryService.create(payload);
    obs$.subscribe({
      next: (res) => {
        this.busy = false;
        if (res.success && res.data) {
          if (this.editingDelivery) {
            this.deliveries = this.deliveries.map(d => d.deliveryId === res.data.deliveryId ? res.data : d);
          } else {
            this.deliveries = [...this.deliveries, res.data];
          }
          if (this.deliveryForm.status === 'DELIVERED' && this.order!.status === 'ORDERED') {
            this.changeStatus('RECEIVED');
          }
          this.flashSuccess('Delivery saved.');
          this.closeDeliveryModal();
        }
      },
      error: (err) => {
        this.busy = false;
        this.errorMsg = err?.error?.message || 'Failed to save delivery.';
      }
    });
  }

  deleteDelivery(d: DeliveryResponse) {
    if (!confirm(`Delete tracking record #${d.deliveryId}?`)) return;
    this.deliveryService.delete(d.deliveryId).subscribe({
      next: () => {
        this.deliveries = this.deliveries.filter(x => x.deliveryId !== d.deliveryId);
        this.flashSuccess('Delivery deleted.');
      },
      error: (err) => { this.errorMsg = err?.error?.message || 'Failed to delete.'; }
    });
  }

  // ---- Helpers ----
  get totalAmount(): number { return this.order?.totalAmount ?? 0; }
  get itemCount(): number { return this.order?.items?.length ?? 0; }

  formatDate(s: string | null | undefined): string {
    if (!s) return '—';
    try { return new Date(s).toLocaleString(); } catch { return s; }
  }
  formatDateOnly(s: string | null | undefined): string {
    if (!s) return '—';
    try { return new Date(s).toLocaleDateString(); } catch { return s; }
  }

  get timeline(): { label: string; status: string; reached: boolean; current: boolean }[] {
    const s = this.order?.status || 'DRAFT';
    const order = ['PENDING', 'APPROVED', 'ORDERED', 'RECEIVED'];
    if (s === 'REJECTED' || s === 'CANCELLED') {
      return [
        { label: 'Submitted', status: 'PENDING', reached: true, current: false },
        { label: s === 'REJECTED' ? 'Rejected' : 'Cancelled', status: s, reached: true, current: true },
      ];
    }
    if (s === 'CANCEL_REQUESTED') {
      return [
        { label: 'Submitted', status: 'PENDING', reached: true, current: false },
        { label: 'Cancel Requested', status: 'CANCEL_REQUESTED', reached: true, current: true },
      ];
    }
    if (s === 'RETURNED') {
      return order.map((step, i) => ({ label: step, status: step, reached: true, current: false }))
                  .concat([{ label: 'Returned', status: 'RETURNED', reached: true, current: true }]);
    }
    const currentIdx = order.indexOf(s);
    return order.map((step, i) => ({
      label: step, status: step,
      reached: currentIdx >= 0 && i <= currentIdx,
      current: i === currentIdx,
    }));
  }

  private flashSuccess(msg: string) { this.successMsg = msg; setTimeout(() => this.successMsg = '', 3000); }
  goBack() { history.length > 1 ? history.back() : this.router.navigate(['/app/orders']); }
}
