import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, switchMap, tap } from 'rxjs';
import { Appointment } from '../model/Appointment';
import { Barber } from '../model/Barber';
import { Service } from '../model/Service';
import { WorkHour } from '../model/WorkHour';

export enum IntervalState {
  available, 
  full, 
  lunch
}
export interface WorkingInterval {
  time: string,
  state: IntervalState
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private readonly apiDomainBase = "http://localhost:3000";
  readonly fiveMinuteInterval = 5 * 60 * 1000;
  services$: BehaviorSubject<Service[]> = new BehaviorSubject<Service[]>([]);

  constructor(private http: HttpClient) {
    this.getServices().subscribe();  
    this.getWorkingHours().subscribe();  
    this.getAvailableIntervals(1, new Date(1579680900000)).subscribe(res => console.log("all intervals", res));
  }

  getBarbers(): Observable<Barber[]> {
    return this.http.get(`${this.apiDomainBase}/barbers`).pipe(
      map((res) => {
        if (!res) {
          return [];
        }
        return res as Barber[];
      }),
      tap(res => console.log("Barbers", res))
    );
  }

  getAppointments(): Observable<Appointment[]> {
    return this.http.get(`${this.apiDomainBase}/appointments`).pipe(
      map((res) => {
        if (!res) {
          return [];
        }
        return (res as Appointment[]).map((item: Appointment) => {
          item.startDate  = item.startDate * 1000;
          return item;
        });
      }),
      tap((res: Appointment[]) => console.log("Appointments", res))
    );
  }

  getServices(): Observable<Service[]> {
    return this.http.get(`${this.apiDomainBase}/services`).pipe(
      map((res) => {
        if (!res) {
          return [];
        }
        return res as Service[];
      }),
      tap((res: Service[]) => {
        this.services$.next(res);
      })
    );
  }

  getWorkingHours(): Observable<WorkHour[]> {
    return this.http.get(`${this.apiDomainBase}/workHours`).pipe(
      map((res) => {
        if (!res) {
          return [];
        }
        return res as WorkHour[];
      }),
      tap((res: WorkHour[]) => console.log("Working hours", res))
    );
  }

  getAvailableIntervals(barberId: number, date: Date): Observable<WorkingInterval[]> {
    const dayOfTheWeek = date.getDay();
    let startOfTheDay: number;
    let startOfLunch: number;
    let endOfTheDay: number;
    let endOfLunch: number;


    console.log("Selected date", date.toDateString());

    return this.getBarbers().pipe(
      switchMap((barbers: Barber[]) => {
        const selectedBarber: Barber | undefined = barbers.find((item: Barber) => item.id === barberId);
        const todayWorkHour: WorkHour | undefined = selectedBarber?.workHours.find((item: WorkHour) => item.day === dayOfTheWeek)
        console.log("barber", selectedBarber);
        console.log("work hour", todayWorkHour);
        if (!todayWorkHour || !todayWorkHour.lunchTime) {
          console.error("This barber doesnt have valid working hours");
          return [];
        }
      
        startOfTheDay = date.setHours(+todayWorkHour.startHour, 0);
        startOfLunch = date.setHours(+todayWorkHour.lunchTime.startHour, 0,);
        endOfTheDay = date.setHours(+todayWorkHour.endHour - 1, 59, 59, 999);
        endOfLunch = date.setHours(+todayWorkHour.lunchTime.startHour, +todayWorkHour.lunchTime.durationMinutes - 1);

        console.log("start of the day", new Date(startOfTheDay).toISOString());
        console.log("end of the day", new Date(endOfTheDay).toISOString());
        console.log("start of the lunch", new Date(startOfLunch).toISOString());
        console.log("end of the lunch", new Date(endOfLunch).toISOString());
        return this.getAppointments();
      }),
      //Filter appontements per barber and todays working hours.
      map((items: Appointment[]) => {
        return items.filter((item: Appointment) => {
          console.log("Appointment date", new Date(item.startDate).toISOString());
          // Filter only appointments that should be displayed depending on selections.
          return item.barberId === barberId && (startOfTheDay < item.startDate && item.startDate < startOfLunch) || (endOfLunch < item.startDate && item.startDate < endOfTheDay); 
        })
      }),
      map((items: Appointment[]) => {
        const dailyIntervals: WorkingInterval[] = [];

        let startTimestamp: number = startOfTheDay;
        let endTimestamp: number = startTimestamp + this.fiveMinuteInterval;
        while(endTimestamp < endOfTheDay) {
          const interval: WorkingInterval = {time: new Date(startTimestamp).toTimeString(), state: IntervalState.available};

          const isOccupied = this.isIntervalOccupied(startTimestamp, endTimestamp, items);

          if (isOccupied) {
            interval.state = IntervalState.full;
          }

          if (startOfLunch <= startTimestamp && startTimestamp < endOfLunch ||
              startOfLunch < endTimestamp && endTimestamp <= endOfLunch
            ) {
              interval.state = IntervalState.lunch;
            }
          
          dailyIntervals.push(interval);
          startTimestamp = startTimestamp + this.fiveMinuteInterval;
          endTimestamp = endTimestamp + this.fiveMinuteInterval;
        }
        

        console.log("Daily intervals", dailyIntervals);
        return dailyIntervals;
      })
    );
  }

  private getService(id: number): Service | undefined {
    const hairServices: Service[] = this.services$.value;
    return hairServices.find((item: Service) => {
      return item.id === id;
    })
  }

  private isIntervalOccupied(startTimestamp: number, endTimestamp: number, appointments: Appointment[]): boolean {
    return appointments.some(item => {
      const hairService = this.getService(item.serviceId);
      if (!hairService) {
        return;
      }
      const endOfAppointment = item.startDate + (hairService.durationMinutes * 60 * 1000);
      return (item.startDate <= startTimestamp && startTimestamp < endOfAppointment) ||
             (item.startDate < endTimestamp && endTimestamp <= endOfAppointment);
    });
  }
}
