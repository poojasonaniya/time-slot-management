import { User } from 'src/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';

@Entity('time_slots')
export class TimeSlot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ default: true })
  isBlocked: boolean;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'int' })
  createdBy: number;

  @ManyToOne(() => User, (user) => user.timeSlots)
  user: User; // Reference to the user who created/blocked this slot
}
