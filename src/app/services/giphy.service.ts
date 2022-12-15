import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GiphyService {

  constructor(
    private http: HttpClient
  ) { }

  getRandomGif(): Observable<string> {
    return this.http.get("http://api.giphy.com/v1/gifs/search?api_key=KeTn0RgXZQF8EDkUGgQmSaJYuWPEz5mI&q=barber").pipe(
      map((res: any) => {
        const maxNumber = 49;
        const randomNumber = Math.floor(Math.random() * (maxNumber  + 1));
        return res.data[randomNumber].images.original.url;
      }),
      tap((res: string) => console.log("Selected GIF", res))
    )
  }
}
