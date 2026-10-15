import { prisma } from "../src/lib/prisma.js";
import type { Equipment, MuscleGroup } from "../src/generated/prisma/enums.js";

const catalog: { name: string; muscleGroup: MuscleGroup; equipment: Equipment }[] = [
  { name: "Bench Press", muscleGroup: "CHEST", equipment: "BARBELL" },
  { name: "Incline Dumbbell Press", muscleGroup: "CHEST", equipment: "DUMBBELL" },
  { name: "Push-up", muscleGroup: "CHEST", equipment: "BODYWEIGHT" },
  { name: "Cable Fly", muscleGroup: "CHEST", equipment: "CABLE" },
  { name: "Deadlift", muscleGroup: "BACK", equipment: "BARBELL" },
  { name: "Pull-up", muscleGroup: "BACK", equipment: "BODYWEIGHT" },
  { name: "Barbell Row", muscleGroup: "BACK", equipment: "BARBELL" },
  { name: "Lat Pulldown", muscleGroup: "BACK", equipment: "CABLE" },
  { name: "Back Squat", muscleGroup: "LEGS", equipment: "BARBELL" },
  { name: "Romanian Deadlift", muscleGroup: "LEGS", equipment: "BARBELL" },
  { name: "Leg Press", muscleGroup: "LEGS", equipment: "MACHINE" },
  { name: "Walking Lunge", muscleGroup: "LEGS", equipment: "DUMBBELL" },
  { name: "Overhead Press", muscleGroup: "SHOULDERS", equipment: "BARBELL" },
  { name: "Lateral Raise", muscleGroup: "SHOULDERS", equipment: "DUMBBELL" },
  { name: "Barbell Curl", muscleGroup: "ARMS", equipment: "BARBELL" },
  { name: "Tricep Pushdown", muscleGroup: "ARMS", equipment: "CABLE" },
  { name: "Plank", muscleGroup: "CORE", equipment: "BODYWEIGHT" },
  { name: "Hanging Leg Raise", muscleGroup: "CORE", equipment: "BODYWEIGHT" },
  { name: "Kettlebell Swing", muscleGroup: "FULL_BODY", equipment: "KETTLEBELL" },
  { name: "Running", muscleGroup: "CARDIO", equipment: "OTHER" },
  { name: "Rowing Machine", muscleGroup: "CARDIO", equipment: "MACHINE" },
];

async function main() {
  // Idempotent: only insert catalog entries that don't exist yet,
  // so the seed can be re-run safely (locally, in CI, after a reset).
  const existing = await prisma.exercise.findMany({
    where: { createdById: null },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((e) => e.name));
  const missing = catalog.filter((e) => !existingNames.has(e.name));

  if (missing.length > 0) {
    await prisma.exercise.createMany({ data: missing });
  }
  console.log(`Seed complete: ${missing.length} added, ${existingNames.size} already present.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
