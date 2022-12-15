import { Component } from '@angular/core';
import { AppointmentService } from 'src/app/services/appointment.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {

  
  constructor(private appointmentsService: AppointmentService) {
    this.appointmentsService.getBarbers().subscribe();
    this.appointmentsService.getAppointments().subscribe(); 
  }
}
