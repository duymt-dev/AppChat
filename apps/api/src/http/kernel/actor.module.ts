// Cung cấp ACTOR_RESOLVER (JWT + membership — TIP-004, AuthzContext — TIP-005) cho route kernel / identity / authz.
import { Module } from '@nestjs/common';
import { AccessTokens, AuthzModule, AuthzResolver, CLOCK, IdentityModule, WorkspacesService, type Clock } from '@appchat/core';
import { ACTOR_RESOLVER, JwtActorResolver } from './request-actor';

@Module({
  imports: [IdentityModule, AuthzModule],
  providers: [
    {
      provide: ACTOR_RESOLVER,
      inject: [AccessTokens, WorkspacesService, AuthzResolver, CLOCK],
      useFactory: (t: AccessTokens, w: WorkspacesService, a: AuthzResolver, c: Clock) => new JwtActorResolver(t, w, a, c),
    },
  ],
  exports: [ACTOR_RESOLVER],
})
export class ActorModule {}
