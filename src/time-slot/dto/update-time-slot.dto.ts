// src/dto/update-time-slot.dto.ts
import { IsDate, IsNumber, IsString } from 'class-validator';

export class updateTimeSlotDto {
  @IsDate()
  date: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsNumber()
  createdBy: number;
}
