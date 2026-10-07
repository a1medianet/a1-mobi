export type UpdateState="current"|"recommended"|"required";

function normalize(value:string|undefined,fallback:string){
  const clean=(value||"").trim();
  return clean||fallback;
}
function tuple(value:string){
  const match=value.match(/^(\d+)\.(\d+)\.(\d+)/);
  return match?[Number(match[1]),Number(match[2]),Number(match[3])] as const:[0,0,0] as const;
}
export function compareVersions(a:string,b:string){
  const left=tuple(a),right=tuple(b);
  for(let i=0;i<3;i++){if(left[i]!==right[i])return left[i]-right[i]}
  return 0;
}
export function appVersionInfo(){
  const version=normalize(process.env.A1_APP_VERSION,"0.1.0");
  const latest=normalize(process.env.A1_LATEST_VERSION,version);
  const minimum=normalize(process.env.A1_MINIMUM_SUPPORTED_VERSION,version);
  const build=normalize(process.env.A1_BUILD_SHA||process.env.VERCEL_GIT_COMMIT_SHA,"local");
  const channel=normalize(process.env.A1_RELEASE_CHANNEL,"pilot");
  const updateState:UpdateState=compareVersions(version,minimum)<0?"required":
    compareVersions(version,latest)<0?"recommended":"current";
  return {product:"a1-mobi",version,build,channel,latest,minimum,updateState};
}
