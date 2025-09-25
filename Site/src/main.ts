import 'zone.js';
import 'zone.js/plugins/zone-patch-fetch';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

const runtimeOverrides = typeof window !== 'undefined' ? window.__env ?? null : null;

console.info('[FlightDeck] Boot runtime configuration', {
  production: environment.production,
  apiBaseUrl: environment.apiBaseUrl,
  runtimeOverrides,
});

bootstrapApplication(AppComponent, {
  providers: [provideAnimations(), provideHttpClient(withFetch())]
}).catch(err => console.error(err));
