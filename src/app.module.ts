import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './entities/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeSlot } from './time-slot/time-slot.entity';
import { TimeSlotModule } from './time-slot/time-slot.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'Pooja@2024',
      database: 'timeslot_db',
      entities: [User, TimeSlot],
      synchronize: true,
      logging: true,
    }),
    TypeOrmModule.forFeature([User, TimeSlot]),
    TimeSlotModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
