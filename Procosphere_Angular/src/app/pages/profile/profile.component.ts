import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { OrderService, OrderResponse } from '../../services/order.service';
import { UserService, UserResponse, ProfileUpdateRequest } from '../../services/user.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css'],
})
export class ProfileComponent implements OnInit {
  isEditing = false;
  isSaving = false;
  errorMsg = '';
  savedMessage = '';

  // All editable profile fields (matches the User entity's user-editable columns).
  formData: ProfileUpdateRequest = {
    firstName: '', lastName: '', email: '', phone: '',
    department: '', company: '', address: '', avatarUrl: '',
  };

  /** Pristine copy used to revert on Cancel. */
  private original: ProfileUpdateRequest = { ...this.formData };

  // Read-only display fields
  role = '';
  userId: number | null = null;

  // Activity stats
  totalOrders = 0;
  approvedOrders = 0;
  totalSpent = 0;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private orderService: OrderService,
  ) {}

  ngOnInit() {
    // Load fresh profile from backend so we get all DB fields
    // (login response only provides a subset).
    this.userService.getMe().subscribe({
      next: (res) => { if (res.success && res.data) this.applyUser(res.data); },
      error: () => { this.applyFromCachedUser(); }
    });

    this.orderService.getAll().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const myId = this.authService.getCurrentUserId();
          const mine: OrderResponse[] = myId ? res.data.filter((o: any) => o.createdBy === myId) : res.data;
          this.totalOrders = mine.length;
          this.approvedOrders = mine.filter(o =>
            o.status === 'APPROVED' || o.status === 'ORDERED' || o.status === 'RECEIVED'
          ).length;
          this.totalSpent = mine.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);
        }
      },
      error: () => {}
    });
  }

  private applyUser(u: UserResponse) {
    this.userId = u.userId;
    this.role = u.role;
    this.formData = {
      firstName:  u.firstName  ?? '',
      lastName:   u.lastName   ?? '',
      email:      u.email      ?? '',
      phone:      u.phone      ?? '',
      department: u.department ?? '',
      company:    u.company    ?? '',
      address:    u.address    ?? '',
      avatarUrl:  u.avatarUrl  ?? '',
    };
    this.original = { ...this.formData };
  }

  /** Fallback when /api/users/me fails — show whatever the login response had. */
  private applyFromCachedUser() {
    const u = this.authService.getCurrentUser();
    if (!u) return;
    this.userId = u.userId;
    this.role = u.role;
    this.formData.firstName = u.firstName ?? '';
    this.formData.lastName  = u.lastName  ?? '';
    this.formData.email     = u.email     ?? '';
    this.original = { ...this.formData };
  }

  get initials(): string {
    return ((this.formData.firstName?.[0] ?? '') + (this.formData.lastName?.[0] ?? '')).toUpperCase() || 'U';
  }

  get displayRole(): string {
    const map: Record<string, string> = { ADMIN: 'Administrator', MANAGER: 'Manager', USER: 'User', SUPPLIER: 'Supplier' };
    return map[this.role] || this.role;
  }

  startEdit() {
    this.isEditing = true;
    this.errorMsg = '';
    this.savedMessage = '';
  }

  cancelEdit() {
    this.formData = { ...this.original };
    this.isEditing = false;
    this.errorMsg = '';
  }

  save() {
    // Light client-side validation
    if (!this.formData.firstName?.trim()) { this.errorMsg = 'First name is required.'; return; }
    if (!this.formData.lastName?.trim())  { this.errorMsg = 'Last name is required.'; return; }
    if (!this.formData.email?.trim() || !/\S+@\S+\.\S+/.test(this.formData.email)) {
      this.errorMsg = 'Please enter a valid email address.'; return;
    }
    if (this.formData.phone && !/^(\+91|0)?[6-9]\d{9}$/.test(this.formData.phone.replace(/[\s-]/g, ''))) {
      this.errorMsg = 'Phone must be a valid Indian mobile (10 digits starting with 6-9).'; return;
    }

    this.isSaving = true;
    this.errorMsg = '';
    this.userService.updateMe(this.formData).subscribe({
      next: (res) => {
        this.isSaving = false;
        if (res.success && res.data) {
          this.applyUser(res.data);
          // Sync the cached user so the layout/sidebar reflects the change immediately.
          const cached = this.authService.getCurrentUser();
          if (cached) {
            const updated = {
              ...cached,
              firstName: res.data.firstName,
              lastName:  res.data.lastName,
              email:     res.data.email,
            };
            localStorage.setItem('user', JSON.stringify(updated));
          }
          this.isEditing = false;
          this.savedMessage = 'Profile updated successfully.';
          setTimeout(() => this.savedMessage = '', 4000);
        } else {
          this.errorMsg = res.message || 'Update failed.';
        }
      },
      error: (err) => {
        this.isSaving = false;
        this.errorMsg = err?.error?.message || 'Failed to save profile.';
      }
    });
  }
}
