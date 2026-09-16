import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LlmCredential } from '../../database/entities';
import { AuthModule } from '../auth/auth.module';
import { ProviderRegistryModule } from '../chat/providers/provider-registry.module';
import { LlmCredentialsController } from './llm-credentials.controller';
import { LlmCredentialsService } from './llm-credentials.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LlmCredential]),
    AuthModule,
    ProviderRegistryModule,
  ],
  controllers: [LlmCredentialsController],
  providers: [LlmCredentialsService],
  exports: [LlmCredentialsService],
})
export class LlmCredentialsModule {}
