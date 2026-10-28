import { apiMode, type Transport } from './transport';
import { httpTransport } from './http-transport';
import { mockTransport } from './mock/mock-transport';

export const transport: Transport = apiMode() === 'http' ? httpTransport : mockTransport;
