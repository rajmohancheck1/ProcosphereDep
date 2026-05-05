import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, AppSettings } from '../../services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
})
export class SettingsComponent implements OnInit {
  savedMessage = '';
  settings!: AppSettings;

  themes: ('light' | 'dark' | 'auto')[] = ['light', 'dark', 'auto'];

  emailFrequencies = [
    { value: 'instant', label: 'Instant', desc: 'Get emails immediately' },
    { value: 'daily',   label: 'Daily Digest', desc: 'Once per day summary' },
    { value: 'weekly',  label: 'Weekly Digest', desc: 'Once per week summary' },
  ];

  constructor(private settingsService: SettingsService) {}

  ngOnInit() {
    this.settings = { ...this.settingsService.value };
  }

  handleSave() {
    this.settingsService.save({ ...this.settings });
    this.savedMessage = 'Settings saved.';
    setTimeout(() => (this.savedMessage = ''), 3000);
  }

  handleReset() {
    if (!confirm('Reset all settings to default values?')) return;
    this.settingsService.reset();
    this.settings = { ...this.settingsService.value };
    this.savedMessage = 'Settings reset to defaults.';
    setTimeout(() => (this.savedMessage = ''), 3000);
  }
}
