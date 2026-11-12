export type BranchStockDevice = { id: string; status: string; locationId: string | null };
export type BranchStockLocation = { id: string };

/** Never offer a device for checkout unless it is in stock at a location of the current branch. */
export function availableBranchDevices<D extends BranchStockDevice>(
  devices: readonly D[],
  locations: readonly BranchStockLocation[],
): D[] {
  const allowed = new Set(locations.map(location => location.id));
  return devices.filter(device => device.status === "IN_STOCK" && !!device.locationId && allowed.has(device.locationId));
}
