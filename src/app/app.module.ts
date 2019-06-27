import { HttpClientModule } from '@angular/common/http';
import { ErrorHandler, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import * as Sentry from '@sentry/browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderModule } from './header/header.module';
import { IconModule } from './icon/icon.module';
import { SentryErrorHandler } from './sentry-error-handler.service';
import { SvgsComponent } from './svgs/svgs.component';

Sentry.init({
  dsn: 'https://c4806b4ac4114ff3b240bab7124a82c9@sentry.io/1492075',
});

@NgModule({
  declarations: [AppComponent, SvgsComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HeaderModule,
    HttpClientModule,
    IconModule,
    // ServiceWorkerModule.register('ngsw-worker.js', {
    //   enabled: environment.production,
    // }),
  ],
  providers: [{ provide: ErrorHandler, useClass: SentryErrorHandler }],
  bootstrap: [AppComponent],
})
export class AppModule {}
