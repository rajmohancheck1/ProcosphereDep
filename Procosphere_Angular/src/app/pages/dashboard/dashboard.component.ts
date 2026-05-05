import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { SupplierDashboardComponent } from './supplier-dashboard.component';
import { ManagerDashboardComponent } from './manager-dashboard.component';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { UserDashboardComponent } from './user-dashboard.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    SupplierDashboardComponent,
    ManagerDashboardComponent,
    AdminDashboardComponent,
    UserDashboardComponent,
  ],
  styleUrls: ['./dashboard.component.css'],
  template: `
    @switch (role) {
      @case ('ADMIN')    { <app-admin-dashboard /> }
      @case ('MANAGER')  { <app-manager-dashboard /> }
      @case ('SUPPLIER') { <app-supplier-dashboard /> }
      @default           { <app-user-dashboard /> }
    }
  `,
})
export class DashboardComponent {
  constructor(private authService: AuthService) {}
  get role(): string { return this.authService.getCurrentUser()?.role || 'USER'; }
}
