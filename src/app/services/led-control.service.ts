
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LedStatus {
  mqttConnected: boolean;
  led1: string;
  led2: string;
  lastMessage: string;
  lastMessageTime: string;
}

export interface LedCommandResponse {
  success: boolean;
  message: string;
  led?: number;
  action?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LedControlService {
  private readonly apiUrl = '/api/leds';

  constructor(private http: HttpClient) {}

  getStatus(): Observable<LedStatus> {
    return this.http.get<LedStatus>(
      `${this.apiUrl}/status`
    );
  }

  turnOn(led: number): Observable<LedCommandResponse> {
    return this.http.post<LedCommandResponse>(
      `${this.apiUrl}/${led}/on`,
      {}
    );
  }

  turnOff(led: number): Observable<LedCommandResponse> {
    return this.http.post<LedCommandResponse>(
      `${this.apiUrl}/${led}/off`,
      {}
    );
  }
}
