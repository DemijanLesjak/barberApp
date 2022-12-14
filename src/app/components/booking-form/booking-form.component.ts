import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Service } from 'src/app/model/Service';
import { AppointmentService, WorkingInterval } from 'src/app/services/appointment.service';

interface BookingFormGroup {
  firstName: FormControl<string | null>;
  lastName: FormControl<string | null>;
  email: FormControl<string | null>;
  contact: FormControl<string | null>;
  barber: FormControl;
  service: FormControl;
  date: FormControl<string | null>;
  time: FormControl;
}
@Component({
  selector: 'app-booking-form',
  templateUrl: './booking-form.component.html',
  styleUrls: ['./booking-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookingFormComponent implements OnInit{

  today = new Date().toISOString().slice(0, 10);
  intervals: WorkingInterval[] = [];
  servicePrice = "";

  bookingForm: FormGroup<BookingFormGroup> = this.fb.group({
    firstName: ["", [Validators.required]],
    lastName: ["", [Validators.required]],
    email: ["", [Validators.required, Validators.email]],
    contact: ["", [Validators.required, Validators.pattern(/^\+?(386)?([1-7][0-9]{7}|([347]0|[3457]1|6[4589]){6})$/gm)]],
    barber: [null, [Validators.required]],
    service: [null, Validators.required],
    date: [this.today, Validators.required],
    time: [null, Validators.required]
  });
  constructor(
    private fb: FormBuilder,
    public appointmentService: AppointmentService,
    private cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.refreshIntervals();
    this.bookingForm.controls.date.valueChanges.subscribe(res => {
      this.refreshIntervals();
      console.log(res)
    });

    this.bookingForm.controls.barber.valueChanges.subscribe(res => {
      this.refreshIntervals();
      console.log(res)
    });

    this.bookingForm.controls.service.valueChanges.subscribe(res => {
      const services: Service[] = this.appointmentService.services$.value;
      if (res === null) {
        return;
      }
      this.servicePrice = services.find(item => {
        return item.id === +res;
      })?.price ?? "";
      this.cd.markForCheck();
    });
  }

  refreshIntervals() {
    this.appointmentService.getAvailableIntervals(
      this.bookingForm.controls.barber.value,
      new Date(this.bookingForm.controls.date.value as string))
      .subscribe((res: WorkingInterval[]) => {
        this.intervals = res;
        this.cd.markForCheck();
      });

  }
}
