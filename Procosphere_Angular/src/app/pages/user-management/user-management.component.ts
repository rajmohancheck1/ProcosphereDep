import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, UserResponse } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';

type Role = 'ADMIN' | 'MANAGER' | 'USER' | 'SUPPLIER';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css'],
})
export class UserManagementComponent implements OnInit {
  users: UserResponse[] = [];
  isLoading = true;
  errorMsg = '';
  successMsg = '';
  searchQuery = '';
  filterRole: 'All' | Role = 'All';
  savingId: number | null = null;

  readonly roles: Role[] = ['ADMIN', 'MANAGER', 'USER', 'SUPPLIER'];

  readonly roleBadgeClass: Record<Role, string> = {
    ADMIN:    'role-admin',
    MANAGER:  'role-manager',
    USER:     'role-user',
    SUPPLIER: 'role-supplier',
  };

  readonly roleLabel: Record<Role, string> = {
    ADMIN: 'Administrator', MANAGER: 'Manager', USER: 'User', SUPPLIER: 'Supplier',
  };

  constructor(private userService: UserService, private authService: AuthService) {}

  ngOnInit() { this.load(); }

  load() {
    this.isLoading = true;
    this.errorMsg = '';
    this.userService.getAll().subscribe({
      next: (res) => {
        if (res.success) this.users = res.data;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err?.status === 403
          ? 'You do not have permission to view users. Admin access required.'
          : (err?.error?.message || 'Failed to load users. Is the backend running on port 8090?');
      }
    });
  }

  get filteredUsers(): UserResponse[] {
    const q = this.searchQuery.toLowerCase();
    return this.users.filter(u => {
      const matchesSearch = !q ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      const matchesRole = this.filterRole === 'All' || u.role === this.filterRole;
      return matchesSearch && matchesRole;
    });
  }

  roleCount(role: Role): number {
    return this.users.filter(u => u.role === role).length;
  }

  isSelf(u: UserResponse): boolean {
    return u.userId === this.authService.getCurrentUserId();
  }

  changeRole(u: UserResponse, newRole: Role) {
    if (u.role === newRole) return;
    if (this.isSelf(u) && u.role === 'ADMIN') {
      // Prevent admin from demoting themselves (would lock them out)
      this.errorMsg = 'You cannot change your own admin role.';
      setTimeout(() => (this.errorMsg = ''), 4000);
      return;
    }
    if (!confirm(`Change ${u.firstName} ${u.lastName}'s role to ${this.roleLabel[newRole]}?`)) return;

    this.savingId = u.userId;
    this.userService.updateRole(u.userId, newRole).subscribe({
      next: (res) => {
        this.savingId = null;
        if (res.success && res.data) {
          this.users = this.users.map(x => x.userId === u.userId ? res.data : x);
          this.successMsg = `Updated ${u.firstName}'s role to ${this.roleLabel[newRole]}.`;
          setTimeout(() => (this.successMsg = ''), 4000);
        }
      },
      error: (err) => {
        this.savingId = null;
        this.errorMsg = err?.error?.message || 'Failed to update role.';
        setTimeout(() => (this.errorMsg = ''), 4000);
      }
    });
  }

  deleteUser(u: UserResponse) {
    if (this.isSelf(u)) {
      this.errorMsg = 'You cannot delete your own account.';
      setTimeout(() => (this.errorMsg = ''), 4000);
      return;
    }
    if (!confirm(`Permanently delete ${u.firstName} ${u.lastName} (${u.email})?`)) return;

    this.savingId = u.userId;
    this.userService.delete(u.userId).subscribe({
      next: () => {
        this.savingId = null;
        this.users = this.users.filter(x => x.userId !== u.userId);
        this.successMsg = `Deleted ${u.firstName} ${u.lastName}.`;
        setTimeout(() => (this.successMsg = ''), 4000);
      },
      error: (err) => {
        this.savingId = null;
        this.errorMsg = err?.error?.message || 'Failed to delete user.';
        setTimeout(() => (this.errorMsg = ''), 4000);
      }
    });
  }

  initials(u: UserResponse): string {
    return ((u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')).toUpperCase() || 'U';
  }
}
