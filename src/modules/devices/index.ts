export const devicesModule = {
  name: "devices",
  owns: ["manufacturers", "families", "models", "variants", "imei-serial"],
  stage: 2,
} as const;