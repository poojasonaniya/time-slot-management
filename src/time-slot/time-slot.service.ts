import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { TimeSlot } from './time-slot.entity';
import { User } from 'src/entities/user.entity';
import { CreateTimeSlotDto } from './dto/create-time-slot.dto';
import { updateTimeSlotDto } from './dto/update-time-slot.dto';
import { ERROR_MSG } from 'src/constants';

@Injectable()
export class TimeSlotService {
  constructor(
    @InjectRepository(TimeSlot)
    private readonly timeSlotRepository: Repository<TimeSlot>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  private isValidTimeRange(startTime: string, endTime: string): boolean {
    try {
      const [startHour, startMinute] = startTime.split(':').map(Number);
      const [endHour, endMinute] = endTime.split(':').map(Number);

      if (startHour < 10 || startHour > 18 || endHour < 10 || endHour > 18) {
        return false;
      }

      if (endHour === 18 && endMinute > 0) {
        return false;
      }

      const startTimeInMinutes = startHour * 60 + startMinute;
      const endTimeInMinutes = endHour * 60 + endMinute;

      const duration = endTimeInMinutes - startTimeInMinutes;

      return (
        duration > 0 && startTimeInMinutes % 30 === 0 && duration % 30 === 0
      );
    } catch (error) {
      console.log('error in isValidTimeRange', error);
      return false;
    }
  }

  private validatDate(date: any) {
    // Check if the date is in the past
    const bookingDate = new Date(date);
    bookingDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (bookingDate < today) {
      return false;
    }

    return true;
  }

  private async getOverlappingTimeSlot(
    date: string,
    userId: number,
    start: string,
    end: string,
  ) {
    const overlapping = await this.timeSlotRepository
      .createQueryBuilder('timeSlot')
      .where('timeSlot.date = :date', { date })
      .andWhere('timeSlot.userId = :userId', { userId })
      .andWhere('timeSlot.isBlocked = :isBlocked', { isBlocked: true })
      .andWhere(
        new Brackets((qb) => {
          qb.where(
            'timeSlot.startTime <= :start AND timeSlot.endTime > :start',
            { start },
          ).orWhere('timeSlot.startTime < :end AND timeSlot.endTime >= :end', {
            end,
          });
        }),
      )
      .getMany();

    return overlapping;
  }

  async create(createTimeSlotDto: CreateTimeSlotDto): Promise<TimeSlot> {
    try {
      const { date, startTime, endTime, userId, createdBy } = createTimeSlotDto;

      // Validate time range (10 AM - 6 PM)
      if (!this.isValidTimeRange(startTime, endTime)) {
        throw new BadRequestException('Invalid Time slot');
      }

      // Check if user exists
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        throw new BadRequestException(ERROR_MSG.USER_NOT_FOUND);
      }

      if (!this.validatDate(date)) {
        throw new BadRequestException(ERROR_MSG.PAST_DATE_BOOKING_ERROR);
      }

      const overlapping = await this.getOverlappingTimeSlot(
        date,
        userId,
        startTime,
        endTime,
      );

      if (overlapping.length > 0) {
        throw new BadRequestException(ERROR_MSG.TIME_SLOT_OVERLAP_ERROR);
      }

      const timeSlot = this.timeSlotRepository.create({
        date,
        startTime,
        endTime,
        userId,
        createdBy,
        isBlocked: true,
      });

      return this.timeSlotRepository.save(timeSlot);
    } catch (error) {
      console.log('error in create slot', error);
      throw error;
    }
  }

  async updateTimeSlot(id: number, body: updateTimeSlotDto): Promise<any> {
    try {
      const { date, startTime, endTime, createdBy } = body;

      // Validate time range (10 AM - 6 PM)
      if (!this.isValidTimeRange(startTime, endTime)) {
        throw new BadRequestException(ERROR_MSG.INVALID_TIME_SLOT_ERROR);
      }

      if (!this.validatDate(date)) {
        throw new BadRequestException(ERROR_MSG.PAST_DATE_BOOKING_ERROR);
      }

      const timeSlot = await this.timeSlotRepository.findOne({
        where: { id: id },
      });

      if (!timeSlot) {
        throw new BadRequestException(ERROR_MSG.TIME_SLOT_NOT_FOUND_ERROR);
      }

      if (createdBy != timeSlot?.createdBy && createdBy != timeSlot?.userId) {
        throw new BadRequestException(ERROR_MSG.PERMISSION_DENIED_UPDATE_SLOT);
      }

      const overlapping = await this.getOverlappingTimeSlot(
        date,
        timeSlot.userId,
        startTime,
        endTime,
      );

      if (overlapping.length > 0) {
        throw new BadRequestException(ERROR_MSG.TIME_SLOT_OVERLAP_ERROR);
      }

      return await this.timeSlotRepository.update(id, body);
    } catch (error) {
      console.log('error in update slot', error);
      throw error;
    }
  }

  async deleteTimeSlot(id: number, deletedBy: number): Promise<void> {
    try {
      const timeSlot = await this.timeSlotRepository.findOne({
        where: { id: id },
      });

      if (!timeSlot) {
        throw new BadRequestException(ERROR_MSG.TIME_SLOT_NOT_FOUND_ERROR);
      }

      if (deletedBy != timeSlot?.createdBy && deletedBy != timeSlot?.userId) {
        throw new BadRequestException(ERROR_MSG.PERMISSION_DENIED_UPDATE_SLOT);
      }
      const result = await this.timeSlotRepository.delete({ id });

      if (result.affected === 0) {
        throw new BadRequestException(ERROR_MSG.TIME_SLOT_NOT_FOUND_ERROR);
      }
    } catch (error) {
      console.log('error in deleteTimeSlot', error);
      throw error;
    }
  }

  private generateTimeSlots(date: string, userId: number): any[] {
    const allSlots: any[] = [];

    for (let hour = 10; hour < 18; hour++) {
      // Format hour with leading zero
      const formattedHour = hour.toString().padStart(2, '0');
      const nextHour = (hour + 1).toString().padStart(2, '0');

      // First 30-minute slot of the hour
      allSlots.push({
        date,
        startTime: `${formattedHour}:00:00`,
        endTime: `${formattedHour}:30:00`,
        user_id: userId,
        isBlocked: false,
      } as any);

      // Second 30-minute slot of the hour
      allSlots.push({
        date,
        startTime: `${formattedHour}:30:00`,
        endTime: `${nextHour}:00:00`,
        user_id: userId,
        isBlocked: false,
      } as any);
    }

    return allSlots;
  }

  async getAvailableSlots(date: any, userId: number): Promise<any[]> {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });

      if (!user) {
        throw new BadRequestException(ERROR_MSG.USER_NOT_FOUND);
      }

      if (!this.validatDate(date)) {
        throw new BadRequestException(ERROR_MSG.INVALID_DATE_ERROR);
      }

      const allSlots = this.generateTimeSlots(date, userId);

      // Get blocked slots from database
      const blockedSlots = await this.timeSlotRepository.find({
        where: {
          date,
          userId,
          isBlocked: true,
        },
      });

      // Filter out blocked slots
      return allSlots.filter(
        (slot: any) =>
          !blockedSlots.some(
            (blockedSlot) =>
              (blockedSlot.startTime <= slot.startTime &&
                blockedSlot.endTime > slot.startTime) ||
              (blockedSlot.startTime < slot.endTime &&
                blockedSlot.endTime >= slot.endTime),
          ),
      );
    } catch (error) {
      console.log('error in getAvailableSlots', error);
      throw error;
    }
  }
}
