import { Component } from '@angular/core';
import { AppointmentService } from './services/appointment.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'barberApp';

  constructor(private appointmentsService: AppointmentService) {

    this.appointmentsService.getBarbers().subscribe();
    this.appointmentsService.getAppointments().subscribe(); 
  }
}
