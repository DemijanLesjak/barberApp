import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, of, switchMap, tap } from 'rxjs';
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
  state: IntervalState,
  timestamp: number
}

@Injectable({
  providedIn: 'root'
})
export class AppointmentService {
  private readonly apiDomainBase = "http://localhost:3000";
  //Five minutes
  // Minutes can be changed to some other compatible time slot.
  readonly timeSlotInterval = 5 * 60 * 1000;
  services$: BehaviorSubject<Service[]> = new BehaviorSubject<Service[]>([]);
  barbers$: BehaviorSubject<Barber[]> = new BehaviorSubject<Barber[]>([]);

  constructor(private http: HttpClient) {
    this.getServices().subscribe();  
    this.getWorkingHours().subscribe();  
    this.getBarbers().subscribe();
  }

  getBarbers(): Observable<Barber[]> {
    return this.http.get(`${this.apiDomainBase}/barbers`).pipe(
      map((res) => {
        if (!res) {
          return [];
        }
        return res as Barber[];
      }),
      tap((res: Barber[])=> this.barbers$.next(res))
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

  postAppointment(startDate: number, barberId: number, serviceId: number): Observable<any> {
    const body = {
      "startDate": startDate / 1000,
      "barberId": +barberId,
      "serviceId": +serviceId
     }
     
    return this.http.post(`${this.apiDomainBase}/appointments`, body);
  }

  getAvailableIntervals(
    barberId: number | null,
    date: Date | null,
    selectedService: Service): Observable<WorkingInterval[]> {
    if (barberId === null || date === null) {
      return of([]);
    }
    const dayOfTheWeek = date.getDay();
    let startOfTheDay: number;
    let startOfLunch: number;
    let endOfTheDay: number;
    let endOfLunch: number;


    console.log("Selected date", date.toDateString());

    return this.getBarbers().pipe(
      switchMap((barbers: Barber[]) => {
        const selectedBarber: Barber | undefined = barbers.find((item: Barber) => item.id === +barberId);
        const todayWorkHour: WorkHour | undefined = selectedBarber?.workHours.find((item: WorkHour) => item.day === dayOfTheWeek)
        console.log("barber", selectedBarber);
        console.log("work hour", todayWorkHour);
        if (!selectedBarber || !todayWorkHour || !todayWorkHour.lunchTime) {
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
          return item.barberId === barberId && (startOfTheDay <= item.startDate && item.startDate < startOfLunch) || (endOfLunch <= item.startDate && item.startDate < endOfTheDay); 
        })
      }),
      map((items: Appointment[]) => {
        const dailyIntervals: WorkingInterval[] = [];

        let startTimestamp: number = startOfTheDay;
        let endTimestamp: number = startTimestamp + this.timeSlotInterval;
        // Create work intervals with time slot allocation and set them status.
        while(endTimestamp <= endOfTheDay + 1) {
          const interval: WorkingInterval = {
            time: new Date(startTimestamp).toTimeString().slice(0, 5),
            state: IntervalState.available,
            timestamp: startTimestamp  
          };

          //Check if any interval is already occupied by appointments.
          const isOccupied = this.isIntervalOccupied(startTimestamp, endTimestamp, items);

          if (isOccupied) {
            interval.state = IntervalState.full;
          }

          // Mark allocation for lunch
          if (startOfLunch <= startTimestamp && startTimestamp < endOfLunch ||
              startOfLunch < endTimestamp && endTimestamp <= endOfLunch
            ) {
              interval.state = IntervalState.lunch;
            }
          
          dailyIntervals.push(interval);
          startTimestamp = startTimestamp + this.timeSlotInterval;
          endTimestamp = endTimestamp + this.timeSlotInterval;
        }
        

        console.log("Daily intervals", dailyIntervals);
        // Filter out not available slot for specific service.
        return this.filterOnlyRelevantIntervals(dailyIntervals, selectedService);
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

  private filterOnlyRelevantIntervals(intervals: WorkingInterval[], service: Service): WorkingInterval[] {
    //Clean up intervals and remove ones that are already full
    const filteredIntervals = intervals.filter((item: WorkingInterval) => {
      return item.state === IntervalState.available;
    });
    const timeSlotInMinutes: number = this.timeSlotInterval / 1000 / 60;
    const freeSlotsNeeded = service.durationMinutes / timeSlotInMinutes;
    // Loop over intervals and check if selected service fits to next available slot. 
    // If not set it as full.
    for (let i = 0; i < filteredIntervals.length; i++) {
      const futureIntervalIndexToCheck = (i + freeSlotsNeeded) - 1;
      if (futureIntervalIndexToCheck >= filteredIntervals.length) {
        filteredIntervals[i].state = IntervalState.full;
        continue;
      }
      const startOfAllocation = filteredIntervals[i].timestamp;
      const endOfAllocation = startOfAllocation + service.durationMinutes * 60 * 1000;
      if (endOfAllocation !== filteredIntervals[futureIntervalIndexToCheck].timestamp + this.timeSlotInterval) {
        filteredIntervals[i].state = IntervalState.full;
      }

    }

    // Finally run filter again and remove items that were set as full above.
    const finalIntervals = filteredIntervals.filter((item: WorkingInterval) => {
      return item.state === IntervalState.available;
    });

    console.log(finalIntervals);
    return finalIntervals;
  }
}
