// Facade action riêng (TIP-003c): cổng capability + gọi có niêm phong. Không export seal trần — chỉ runSystemAction niêm phong.
export { canonicalDigest, systemCapabilityOf, type SystemCapability, type SystemSourceKind } from './capability';
export { registerSystemVerifier, runSystemAction, systemContext, systemVerifierRegistered, unregisterSystemVerifier, type SystemTrigger, type SystemVerifier, type VerifierOptions } from './admission';
export { dispositionOf, type SystemDisposition } from './receipt';
export { stableTriggerId } from './trigger-id';
