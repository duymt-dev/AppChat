// integration.form_schema (integrations.manage, read — TIP-023c G3): trường form kết nối theo manifest, không giá trị credential.
import { Injectable } from '@nestjs/common';
import { connectorRegistry } from '@appchat/integrations';
import type { ActionInput, integrationFormSchema } from '@appchat/actions';
import type { ActionContext } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { connectorEntry, formFields, type FormField } from '../services/form-schema';

type Input = ActionInput<typeof integrationFormSchema>;
type Out = { provider: string; name: string; status: 'ga' | 'beta' | 'coming_soon'; auth_kind: string; fields: FormField[]; testable: boolean };

@Injectable()
@ActionHandler('integration.form_schema')
export class IntegrationFormSchemaHandler implements Handler<Input, Out> {
  async execute(_ctx: ActionContext, input: Input): Promise<HandlerOutcome<Out>> {
    const e = connectorEntry(connectorRegistry, input.provider);
    const m = e.manifest;
    return { result: { provider: m.key, name: m.name, status: m.status, auth_kind: m.auth.kind, fields: formFields(e), testable: m.status !== 'coming_soon' && !!e.adapter?.test } };
  }
}
