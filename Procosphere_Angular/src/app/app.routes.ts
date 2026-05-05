import { Routes } from '@angular/router';
import { authGuard, adminGuard, roleGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent
      ),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/product-catalog/product-catalog.component').then(
            (m) => m.ProductCatalogComponent
          ),
      },
      {
        path: 'products/:id',
        loadComponent: () =>
          import('./pages/product-detail/product-detail.component').then(
            (m) => m.ProductDetailComponent
          ),
      },
      {
        path: 'my-products',
        canActivate: [roleGuard(['SUPPLIER', 'ADMIN'])],
        loadComponent: () =>
          import('./pages/my-products/my-products.component').then(
            (m) => m.MyProductsComponent
          ),
      },
      {
        path: 'create-order',
        // MANAGER/ADMIN may reach this via "Create Reorder" actions.
        canActivate: [roleGuard(['USER', 'SUPPLIER', 'MANAGER', 'ADMIN'])],
        loadComponent: () =>
          import('./pages/create-order/create-order.component').then(
            (m) => m.CreateOrderComponent
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/order-history/order-history.component').then(
            (m) => m.OrderHistoryComponent
          ),
      },
      {
        path: 'orders/:id',
        loadComponent: () =>
          import('./pages/order-detail/order-detail.component').then(
            (m) => m.OrderDetailComponent
          ),
      },
      {
        path: 'delivery',
        loadComponent: () =>
          import('./pages/delivery-tracking/delivery-tracking.component').then(
            (m) => m.DeliveryTrackingComponent
          ),
      },
      {
        path: 'inventory',
        canActivate: [roleGuard(['ADMIN', 'MANAGER'])],
        loadComponent: () =>
          import(
            './pages/inventory-monitoring/inventory-monitoring.component'
          ).then((m) => m.InventoryMonitoringComponent),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./pages/notifications/notifications.component').then(
            (m) => m.NotificationsComponent
          ),
      },
      {
        path: 'users',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/user-management/user-management.component').then(
            (m) => m.UserManagementComponent
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/profile.component').then(
            (m) => m.ProfileComponent
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/settings.component').then(
            (m) => m.SettingsComponent
          ),
      },
      {
        path: 'set-password',
        loadComponent: () =>
          import('./pages/set-password/set-password.component').then(
            (m) => m.SetPasswordComponent
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'app' },
];
