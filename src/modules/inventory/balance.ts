export type BalanceMovement = {
  quantity: number;
  fromLocationId?: string;
  toLocationId?: string;
};

export function calculateLocationBalance(
  locationId: string,
  movements: readonly BalanceMovement[],
): number {
  return movements.reduce((balance, movement) => {
    const incoming = movement.toLocationId === locationId ? movement.quantity : 0;
    const outgoing = movement.fromLocationId === locationId ? movement.quantity : 0;
    return balance + incoming - outgoing;
  }, 0);
}

export function isLowStock(balance: number, threshold: number): boolean {
  return balance <= threshold;
}