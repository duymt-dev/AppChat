// Trí nhớ khách (TIP-015b): contact.memory_list / contact.remember / contact.memory_forget. Ghi qua Executor; gộp trí nhớ chạy trong contact.merge (`./merge`).
import { Module } from '@nestjs/common';
import { ContactMemoryForgetHandler, ContactRememberHandler } from './handlers';
import { ContactMemoryListHandler } from './read';

@Module({ providers: [ContactMemoryListHandler, ContactRememberHandler, ContactMemoryForgetHandler] })
export class ContactMemoryModule {}
