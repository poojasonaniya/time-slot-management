import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { TimeSlotService } from './time-slot.service';
import { CreateTimeSlotDto } from './dto/create-time-slot.dto';
import { updateTimeSlotDto } from './dto/update-time-slot.dto';

@Controller('time-slots')
export class TimeSlotController {
  constructor(private readonly timeSlotService: TimeSlotService) {}

  @Post()
  create(@Body() body: CreateTimeSlotDto): Promise<any> {
    return this.timeSlotService.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: number,
    @Body() body: updateTimeSlotDto,
  ): Promise<any> {
    return this.timeSlotService.updateTimeSlot(id, body);
  }

  @Delete(':id')
  delete(
    @Param('id') id: number,
    @Query('deletedBy') deletedBy: number,
  ): Promise<void> {
    return this.timeSlotService.deleteTimeSlot(id, deletedBy);
  }

  @Get('available')
  findAvailable(
    @Query('date') date: string,
    @Query('user_id') user_id: number,
  ) {
    return this.timeSlotService.getAvailableSlots(new Date(date), user_id);
  }
}
