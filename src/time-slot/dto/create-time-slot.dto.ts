// src/dto/create-time-slot.dto.ts
import {
  IsDate,
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export class CreateTimeSlotDto {
  @IsNumber()
  userId: number;

  @IsNumber()
  createdBy: number;

  @IsDate()
  date: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsBoolean()
  @IsOptional()
  is_blocked?: boolean;
}
