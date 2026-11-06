import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import {
  FanDialComponent
} from './components/fan-dial/fan-dial.component';

import {
  SmartHomePanelComponent
} from './components/smart-home-panel/smart-home-panel.component';
import { SeguridadComponent } from './components/seguridad/seguridad.component';
import { SecurityKeypadComponent } from './components/security-keypad/security-keypad.component';
import { UsuariosComponent } from './components/usuarios/usuarios.component';
import { HistorialSeguridadComponent } from './components/historial-seguridad/historial-seguridad.component';
import { AuthInterceptor } from './interceptors/auth.interceptor';

@NgModule({
  declarations: [
    AppComponent,
    FanDialComponent,
    SmartHomePanelComponent,
    SeguridadComponent,
    SecurityKeypadComponent,
    UsuariosComponent,
    HistorialSeguridadComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ],
  bootstrap: [
    AppComponent
  ]
})
export class AppModule {}
