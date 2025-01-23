import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { TimeSlot } from './time-slot.entity';
import { User } from 'src/entities/user.entity';
import { CreateTimeSlotDto } from './dto/create-time-slot.dto';
import { updateTimeSlotDto } from './dto/update-time-slot.dto';

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

  private validateBookingDate(date: any) {
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
    const { date, startTime, endTime, userId, createdBy } = createTimeSlotDto;

    // Validate time range (10 AM - 6 PM)
    if (!this.isValidTimeRange(startTime, endTime)) {
      throw new BadRequestException('Invalid Time slot');
    }

    // Check if user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!this.validateBookingDate(date)) {
      throw new BadRequestException('Cannot book time slots for past dates');
    }

    const overlapping = await this.getOverlappingTimeSlot(
      date,
      userId,
      startTime,
      endTime,
    );

    console.log(`overlapping------------>`, overlapping);

    if (overlapping.length > 0) {
      throw new BadRequestException('Time slot overlaps with existing slots');
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
  }

  async updateTimeSlot(id: number, body: updateTimeSlotDto): Promise<any> {
    const { date, startTime, endTime, createdBy } = body;

    // Validate time range (10 AM - 6 PM)
    if (!this.isValidTimeRange(startTime, endTime)) {
      throw new BadRequestException('Invalid Time slot');
    }

    if (!this.validateBookingDate(date)) {
      throw new BadRequestException('Cannot book time slots for past dates');
    }

    const timeSlot = await this.timeSlotRepository.findOne({
      where: { id: id },
    });

    if (!timeSlot) {
      throw new BadRequestException('timeslot with given id does not exist');
    }

    if (createdBy != timeSlot?.createdBy && createdBy != timeSlot?.userId) {
      throw new BadRequestException(
        'you do not have permission to update this slot',
      );
    }

    const overlapping = await this.getOverlappingTimeSlot(
      date,
      timeSlot.userId,
      startTime,
      endTime,
    );

    console.log(`overlapping------------>`, overlapping);

    if (overlapping.length > 0) {
      throw new BadRequestException('Time slot overlaps with existing slots');
    }

    return await this.timeSlotRepository.update(id, body);
  }

  async deleteTimeSlot(id: number, deletedBy: number): Promise<void> {
    const timeSlot = await this.timeSlotRepository.findOne({
      where: { id: id },
    });

    if (!timeSlot) {
      throw new BadRequestException('timeslot with given id does not exist');
    }

    if (deletedBy != timeSlot?.createdBy && deletedBy != timeSlot?.userId) {
      throw new BadRequestException(
        'you do not have permission to delete this slot',
      );
    }
    const result = await this.timeSlotRepository.delete({ id });

    if (result.affected === 0) {
      throw new BadRequestException('Time slot not found or unauthorized');
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
    const user = await this.userRepository.findOne({ where: { id: userId } });

    console.log(`user-------------->`, user);

    if (!user) {
      throw new BadRequestException('User not found');
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

    console.log(`blockedSlots---------->`, blockedSlots);

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
  }
}
