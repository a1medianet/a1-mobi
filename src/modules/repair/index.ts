export const repairModule = {
  name: "repair",
  owns: ["intake", "diagnosis", "estimate", "approval", "parts", "warranty"],
  stage: 4,
} as const;