import { Module, Global } from '@nestjs/common';
import { TemporalClientService } from './client';

@Global()
@Module({
  providers: [TemporalClientService],
  exports: [TemporalClientService],
})
export class TemporalModule {}
