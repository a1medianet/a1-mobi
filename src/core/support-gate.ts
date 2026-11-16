// Central, fail-closed Mobi pilot gate. Production customers remain disabled
// until both the feature and reviewed API integration are explicitly accepted.
export function mobiSupportGate(env:Record<string,string|undefined>):boolean {
 return env.A1_MOBI_SUPPORT_FEATURE==="enabled"
   && env.A1_MOBI_SUPPORT_API_ACCEPTED==="true";
}
