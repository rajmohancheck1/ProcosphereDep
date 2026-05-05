import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeliveryService, DeliveryResponse } from '../../services/delivery.service';

interface TimelineStep { label: string; date: string; completed: boolean; current?: boolean; }

interface DeliveryView {
  trackingId: string; orderId: number; orderTitle: string; status: string;
  estimatedDelivery: string; progress: number; timeline: TimelineStep[];
}

@Component({
  selector: 'app-delivery-tracking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delivery-tracking.component.html',
  styleUrls: ['./delivery-tracking.component.css'],
})
export class DeliveryTrackingComponent implements OnInit {
  isLoading = true;
  errorMsg = '';
  deliveries: DeliveryView[] = [];

  statusColors: Record<string, string> = {
    Processing:          'del-processing',
    'In Transit':        'del-in-transit',
    'Out for Delivery':  'del-in-transit',
    Delivered:           'del-delivered',
    PENDING:             'del-processing',
    SHIPPED:             'del-in-transit',
    IN_TRANSIT:          'del-in-transit',
    OUT_FOR_DELIVERY:    'del-in-transit',
    DELIVERED:           'del-delivered',
  };

  get inTransitCount(): number {
    return this.deliveries.filter(d =>
      d.status === 'SHIPPED' || d.status === 'IN_TRANSIT' || d.status === 'In Transit'
    ).length;
  }
  get outForDeliveryCount(): number {
    return this.deliveries.filter(d =>
      d.status === 'OUT_FOR_DELIVERY' || d.status === 'Out for Delivery'
    ).length;
  }
  get deliveredCount(): number {
    return this.deliveries.filter(d =>
      d.status === 'DELIVERED' || d.status === 'Delivered'
    ).length;
  }

  constructor(private deliveryService: DeliveryService) {}

  ngOnInit() {
    this.deliveryService.getAll().subscribe({
      next: (res) => {
        if (res.success) this.deliveries = res.data.map(d => this.mapDelivery(d));
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err?.error?.message || 'Failed to load deliveries. Is the backend running on port 8090?';
      }
    });
  }

  private mapDelivery(d: DeliveryResponse): DeliveryView {
    const steps = ['Order Placed', 'Processing', 'Shipped', 'In Transit', 'Out for Delivery', 'Delivered'];
    const statusOrder: Record<string, number> = {
      PENDING: 1, Processing: 1,
      SHIPPED: 2, 'In Transit': 3, IN_TRANSIT: 3,
      OUT_FOR_DELIVERY: 4, 'Out for Delivery': 4,
      DELIVERED: 5, Delivered: 5,
    };
    const currentIdx = statusOrder[d.status || ''] ?? 1;
    const progress = Math.round((currentIdx / (steps.length - 1)) * 100);

    const timeline: TimelineStep[] = steps.map((label, i) => ({
      label,
      date: i === 2 ? (d.shippedDate?.split('T')[0] ?? '—')
           : i === 5 ? (d.deliveredDate?.split('T')[0] ?? '—')
           : '—',
      completed: i <= currentIdx,
      current: i === currentIdx,
    }));

    return {
      trackingId: d.trackingNumber || `TRK-${d.deliveryId}`,
      orderId: d.orderId,
      orderTitle: d.orderTitle || `ORD-${d.orderId}`,
      status: d.status || 'PENDING',
      estimatedDelivery: d.deliveredDate?.split('T')[0] ?? '—',
      progress,
      timeline,
    };
  }
}
