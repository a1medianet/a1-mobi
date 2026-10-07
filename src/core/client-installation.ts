export const INSTALLATION_KEY="a1.mobi.installation.v1";

export function getInstallationId(){
  const current=window.localStorage.getItem(INSTALLATION_KEY);
  if(current)return current;
  const created=crypto.randomUUID();
  window.localStorage.setItem(INSTALLATION_KEY,created);
  return created;
}
