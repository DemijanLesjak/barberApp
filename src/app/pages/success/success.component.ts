import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { GiphyService } from 'src/app/services/giphy.service';

@Component({
  selector: 'app-success',
  templateUrl: './success.component.html',
  styleUrls: ['./success.component.scss'],
})
export class SuccessComponent {
  gif$: Observable<string>;
  constructor(
    public giphy: GiphyService
  ) {
    this.gif$ = this.giphy.getRandomGif();
  }
}
