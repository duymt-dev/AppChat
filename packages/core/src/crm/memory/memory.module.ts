// Trí nhớ khách (TIP-015b): contact.memory_list / contact.remember / contact.memory_forget + contact.summarize (AiRunner từ AiModule — AiModule
// không import crm nên không vòng DI). Ghi qua Executor; gộp trí nhớ chạy trong contact.merge (`./merge`).
import { Module } from '@nestjs/common';
import { ContactMemoryForgetHandler, ContactRememberHandler } from './handlers';
import { ContactMemoryListHandler } from './read';
import { ContactSummarizeHandler } from './summary-handler';
import { AiModule } from '../../ai/ai.module';

@Module({ imports: [AiModule], providers: [ContactMemoryListHandler, ContactRememberHandler, ContactMemoryForgetHandler, ContactSummarizeHandler] })
export class ContactMemoryModule {}
