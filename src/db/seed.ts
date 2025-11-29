import { db, globalUnitConversions } from "./index";

const unitConversions = [
  // Weight
  { id: "lb:g", fromUnit: "lb", toUnit: "g", factor: 453.592 },
  { id: "oz:g", fromUnit: "oz", toUnit: "g", factor: 28.3495 },
  { id: "kg:g", fromUnit: "kg", toUnit: "g", factor: 1000 },
  // Volume
  { id: "l:ml", fromUnit: "l", toUnit: "ml", factor: 1000 },
  { id: "cup:ml", fromUnit: "cup", toUnit: "ml", factor: 236.588 },
  { id: "tbsp:ml", fromUnit: "tbsp", toUnit: "ml", factor: 14.787 },
  { id: "tsp:ml", fromUnit: "tsp", toUnit: "ml", factor: 4.929 },
  { id: "fl_oz:ml", fromUnit: "fl_oz", toUnit: "ml", factor: 29.574 },
  // Count
  { id: "dozen:count", fromUnit: "dozen", toUnit: "count", factor: 12 },
];

export async function seed() {
  console.log("Seeding unit conversions...");
  
  for (const conversion of unitConversions) {
    await db.insert(globalUnitConversions)
      .values(conversion)
      .onConflictDoNothing();
  }
  
  console.log("Seeding complete!");
}

// Run if called directly
if (require.main === module) {
  seed().catch(console.error);
}
