import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Maps a backend notificationType to the settings toggle that governs it.
 * Returning null means the notification is always shown (no toggle).
 */
const TYPE_TO_TOGGLE: Record<string, keyof NotificationSettings | null> = {
  ORDER_CREATED:   'orderUpdates',
  ORDER_APPROVED:  'orderUpdates',
  ORDER_REJECTED:  'orderUpdates',
  ORDER_DELIVERED: 'deliveryAlerts',
  ORDER_SHIPPED:   'deliveryAlerts',
  ORDER_RETURNED:  'deliveryAlerts',
  APPROVAL_REQUIRED: 'orderUpdates',
  LOW_STOCK:       'lowStockAlerts',
  CRITICAL_STOCK:  'lowStockAlerts',
  PRICE_UPDATE:    null,
  NEW_SUPPLIER:    null,
  GENERAL:         null,
};

export interface NotificationSettings {
  emailNotifications: boolean;
  orderUpdates: boolean;
  lowStockAlerts: boolean;
  deliveryAlerts: boolean;
  weeklyReports: boolean;
}

export interface AppSettings extends NotificationSettings {
  twoFactorAuth: boolean;
  sessionTimeout: string;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  emailFrequency: 'instant' | 'daily' | 'weekly';
}

const DEFAULTS: AppSettings = {
  emailNotifications: true,
  orderUpdates: true,
  lowStockAlerts: true,
  deliveryAlerts: true,
  weeklyReports: false,
  twoFactorAuth: false,
  sessionTimeout: '30',
  theme: 'light',
  language: 'en',
  emailFrequency: 'instant',
};

const STORAGE_KEY = 'appSettings';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private subject = new BehaviorSubject<AppSettings>(this.loadFromStorage());

  /** Current settings stream (emits on every save). */
  readonly settings$: Observable<AppSettings> = this.subject.asObservable();

  get value(): AppSettings { return this.subject.value; }

  save(next: AppSettings): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    this.subject.next({ ...next });
  }

  reset(): void { this.save({ ...DEFAULTS }); }

  /** Returns true if this notification type should be displayed per current toggles. */
  shouldShowNotification(type: string): boolean {
    const toggle = TYPE_TO_TOGGLE[type];
    if (!toggle) return true; // no toggle → always show
    return !!this.value[toggle];
  }

  private loadFromStorage(): AppSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULTS };
      return { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULTS };
    }
  }
}
