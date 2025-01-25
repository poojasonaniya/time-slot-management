import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from './entities/user.entity';
import { TimeSlot } from './time-slot/time-slot.entity';
import { TimeSlotModule } from './time-slot/time-slot.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: process.env.DB_TYPE as any,
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [User, TimeSlot],
      synchronize: true,
      logging: true,
    }),
    TypeOrmModule.forFeature([User, TimeSlot]),
    TimeSlotModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
