import 'zone.js';
import 'zone.js/plugins/zone-patch-fetch';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/interceptors/auth.interceptor';

const runtimeOverrides = typeof window !== 'undefined' ? window.__env ?? null : null;

console.info('[FlightDeck] Boot runtime configuration', {
  production: environment.production,
  apiBaseUrl: environment.apiBaseUrl,
  runtimeOverrides,
});

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideRouter(routes),
  ],
}).catch((err) => console.error(err));
