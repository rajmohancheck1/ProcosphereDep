import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

type Mode = 'login' | 'register' | 'email-login';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  showPassword = false;
  rememberMe = false;
  mode: Mode = 'login';
  get isLoginMode() { return this.mode === 'login'; }

  formData = { email: '', password: '', firstName: '', lastName: '' };
  errors: Record<string, string> = {};
  isLoading = false;
  successMessage = '';

  constructor(private router: Router, private authService: AuthService) {}

  validateForm(): boolean {
    const e: Record<string, string> = {};
    if (this.mode === 'register') {
      if (!this.formData.firstName) e['firstName'] = 'First name is required';
      if (!this.formData.lastName)  e['lastName']  = 'Last name is required';
    }
    if (this.mode !== 'email-login') {
      if (!this.formData.email) e['email'] = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(this.formData.email)) e['email'] = 'Please enter a valid email address';
    }
    if (this.mode === 'login' || this.mode === 'register') {
      if (!this.formData.password) e['password'] = 'Password is required';
      else if (this.formData.password.length < 6) e['password'] = 'Password must be at least 6 characters';
    }
    if (this.mode === 'email-login') {
      if (!this.formData.email) e['email'] = 'Email is required';
      else if (!/\S+@\S+\.\S+/.test(this.formData.email)) e['email'] = 'Please enter a valid email address';
    }
    this.errors = e;
    return Object.keys(e).length === 0;
  }

  handleLogin(e: Event) {
    e.preventDefault();
    if (!this.validateForm()) return;
    this.isLoading = true;
    this.errors = {};
    this.authService.login({ email: this.formData.email, password: this.formData.password }).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) this.router.navigate(['/app']);
        else this.errors['general'] = res.message || 'Login failed';
      },
      error: (err) => {
        this.isLoading = false;
        this.errors['general'] = err?.error?.message || 'Invalid email or password. Please check credentials.';
      }
    });
  }

  handleRegister(e: Event) {
    e.preventDefault();
    if (!this.validateForm()) return;
    this.isLoading = true;
    this.errors = {};
    this.authService.register({
      firstName: this.formData.firstName,
      lastName:  this.formData.lastName,
      email:     this.formData.email,
      password:  this.formData.password,
    }).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) {
          this.successMessage = 'Account created! You can now log in. An admin will assign your role.';
          this.mode = 'login';
          this.formData.password = '';
          setTimeout(() => (this.successMessage = ''), 6000);
        } else {
          this.errors['general'] = res.message || 'Registration failed';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errors['general'] = err?.error?.message || 'Registration failed. Email may already be in use.';
      }
    });
  }

  handleEmailLogin(e: Event) {
    e.preventDefault();
    if (!this.validateForm()) return;
    this.isLoading = true;
    this.errors = {};
    this.authService.loginByEmail(this.formData.email).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success) this.router.navigate(['/app/set-password']);
        else this.errors['general'] = res.message || 'Login failed';
      },
      error: (err) => {
        this.isLoading = false;
        this.errors['general'] = err?.error?.message || 'No approved reset request found for this email.';
      }
    });
  }

  handleSubmit(e: Event) {
    if (this.mode === 'login')       this.handleLogin(e);
    else if (this.mode === 'register') this.handleRegister(e);
    else                               this.handleEmailLogin(e);
  }

  setMode(m: Mode) { this.mode = m; this.errors = {}; this.successMessage = ''; }

  get hasErrors(): boolean { return Object.keys(this.errors).length > 0; }
}
