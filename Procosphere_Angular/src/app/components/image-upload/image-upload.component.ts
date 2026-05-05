import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileService } from '../../services/file.service';

/**
 * Reusable image-upload widget. Lets the user either upload a file (which the
 * backend stores and returns a URL for) or paste an external URL directly.
 *
 * Two-way binds the resulting URL via [(value)] / valueChange.
 */
@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-2">
      <!-- Preview -->
      <div class="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
        @if (resolvedPreview) {
          <img [src]="resolvedPreview" alt="Preview" class="w-full h-full object-contain"
               (error)="onImageError()" />
        } @else {
          <div class="w-full h-full flex items-center justify-center text-gray-400 text-sm text-center px-4">
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                <circle cx="9" cy="9" r="2"/>
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
              </svg>
              No image yet
            </div>
          </div>
        }

        @if (uploading) {
          <div class="absolute inset-0 bg-white/70 flex items-center justify-center">
            <p class="text-sm text-gray-700">Uploading...</p>
          </div>
        }
      </div>

      <!-- Controls -->
      <div class="flex flex-wrap items-center gap-2">
        <label class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer inline-flex items-center gap-1"
               [class.opacity-50]="uploading" [class.cursor-not-allowed]="uploading">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" x2="12" y1="3" y2="15"/>
          </svg>
          {{ value ? 'Replace image' : 'Upload image' }}
          <input type="file" class="hidden"
                 accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                 (change)="onFilePicked($event)" [disabled]="uploading" />
        </label>

        @if (value) {
          <button type="button" (click)="clear()" class="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Remove</button>
        }
      </div>

      @if (errorMsg) {
        <p class="text-xs text-red-600">{{ errorMsg }}</p>
      } @else {
        <p class="text-xs text-gray-500">JPG, PNG, GIF, WebP or SVG. Max 5 MB.</p>
      }

      <!-- Optional manual URL entry -->
      <details class="text-xs">
        <summary class="text-gray-500 cursor-pointer hover:text-gray-700">Or paste an image URL instead</summary>
        <input type="text" [ngModel]="value || ''" (ngModelChange)="setUrl($event)"
               placeholder="https://example.com/image.jpg"
               class="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
      </details>
    </div>
  `,
})
export class ImageUploadComponent {
  /** The current image URL (relative "/uploads/..." or absolute). */
  @Input() value: string | null | undefined = '';
  @Output() valueChange = new EventEmitter<string>();

  uploading = false;
  errorMsg = '';
  imageBroken = false;

  constructor(private fileService: FileService) {}

  /** Display URL — turns relative backend paths into absolute. */
  get resolvedPreview(): string | null {
    if (!this.value || this.imageBroken) return null;
    return this.fileService.toAbsoluteUrl(this.value);
  }

  onFilePicked(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.errorMsg = '';
    try {
      this.fileService.validate(file);
    } catch (e: any) {
      this.errorMsg = e.message || 'Invalid file.';
      input.value = '';
      return;
    }

    this.uploading = true;
    this.fileService.uploadProductImage(file).subscribe({
      next: (url) => {
        this.uploading = false;
        this.value = url;
        this.imageBroken = false;
        this.valueChange.emit(url);
        input.value = '';
      },
      error: (err) => {
        this.uploading = false;
        this.errorMsg = err?.error?.message || err?.message || 'Upload failed.';
        input.value = '';
      }
    });
  }

  setUrl(url: string) {
    this.value = url;
    this.imageBroken = false;
    this.errorMsg = '';
    this.valueChange.emit(url);
  }

  clear() {
    this.value = '';
    this.imageBroken = false;
    this.valueChange.emit('');
  }

  onImageError() {
    this.imageBroken = true;
    this.errorMsg = 'Could not load image from this URL.';
  }
}
