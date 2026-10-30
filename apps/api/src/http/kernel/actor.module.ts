// Cung cấp ACTOR_RESOLVER (JWT + membership — TIP-004) cho route kernel và route identity.
import { Module } from '@nestjs/common';
import { AccessTokens, CLOCK, IdentityModule, WorkspacesService, type Clock } from '@appchat/core';
import { ACTOR_RESOLVER, JwtActorResolver } from './request-actor';

@Module({
  imports: [IdentityModule],
  providers: [
    {
      provide: ACTOR_RESOLVER,
      inject: [AccessTokens, WorkspacesService, CLOCK],
      useFactory: (t: AccessTokens, w: WorkspacesService, c: Clock) => new JwtActorResolver(t, w, c),
    },
  ],
  exports: [ACTOR_RESOLVER],
})
export class ActorModule {}
