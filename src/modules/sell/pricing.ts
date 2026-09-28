export type PriceDecisionInput = {
  basePrice: number;
  minimumPrice: number;
  finalPrice: number;
  canOverrideFloor: boolean;
  overrideActorId?: string;
  overrideReason?: string;
};

export type PriceDecision = {
  deltaFromBase: number;
  belowFloor: boolean;
  overrideRequired: boolean;
};

export function evaluatePrice(input: PriceDecisionInput): PriceDecision {
  if (![input.basePrice, input.minimumPrice, input.finalPrice].every(Number.isFinite)) {
    throw new Error("Prices must be finite numbers");
  }
  if (input.basePrice < 0 || input.minimumPrice < 0 || input.finalPrice < 0) {
    throw new Error("Prices cannot be negative");
  }
  if (input.minimumPrice > input.basePrice) {
    throw new Error("Minimum price cannot exceed base price");
  }

  const belowFloor = input.finalPrice < input.minimumPrice;
  if (belowFloor && !input.canOverrideFloor) {
    throw new Error("Selling below the minimum price requires permission");
  }
  if (belowFloor && (!input.overrideActorId || !input.overrideReason?.trim())) {
    throw new Error("A price override requires actor and reason");
  }

  return {
    deltaFromBase: roundMoney(input.finalPrice - input.basePrice),
    belowFloor,
    overrideRequired: belowFloor,
  };
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
}
