import { pgTable, text, integer, real, timestamp, uuid, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================
// MULTI-TENANT: Households & Profiles
// ============================================

// Households - top-level tenant (1 Auth User = 1 Household)
export const households = pgTable("households", {
  id: uuid("id").primaryKey(), // Matches auth.users.id
  name: text("name").notNull().default("My Household"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Profiles - users within a household (Netflix-style)
export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: 'cascade' }),
  displayName: text("display_name").notNull(),
  avatarColor: text("avatar_color").notNull().default("terracotta"),
  pinHash: text("pin_hash"), // NULL = no PIN
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Household relations
export const householdsRelations = relations(households, ({ many }) => ({
  profiles: many(profiles),
  masterIngredients: many(masterIngredients),
  containers: many(containers),
}));

// Profile relations
export const profilesRelations = relations(profiles, ({ one }) => ({
  household: one(households, {
    fields: [profiles.householdId],
    references: [households.id],
  }),
}));

// Reference data - built dynamically by agent
export const masterIngredients = pgTable("master_ingredients", {
  id: text("id").primaryKey(),
  householdId: uuid("household_id").references(() => households.id, { onDelete: 'cascade' }),
  canonicalName: text("canonical_name").notNull(),
  category: text("category"), // produce, protein, dairy, pantry, frozen, beverage
  defaultUnit: text("default_unit"), // g, ml, count
  defaultShelfLifeDays: integer("default_shelf_life_days"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ingredientAliases = pgTable("ingredient_aliases", {
  alias: text("alias").primaryKey(),
  householdId: uuid("household_id").references(() => households.id, { onDelete: 'cascade' }),
  masterId: text("master_id").notNull().references(() => masterIngredients.id),
  source: text("source").default("agent"), // agent, user_correction
  createdAt: timestamp("created_at").defaultNow(),
});

// Unit conversions - household-scoped
export const globalUnitConversions = pgTable("global_unit_conversions", {
  id: text("id").primaryKey(), // composite key as single string: "from_unit:to_unit"
  householdId: uuid("household_id").references(() => households.id, { onDelete: 'cascade' }),
  fromUnit: text("from_unit").notNull(),
  toUnit: text("to_unit").notNull(),
  factor: real("factor").notNull(),
});

// Inventory - core state
export const containers = pgTable("containers", {
  id: text("id").primaryKey(),
  householdId: uuid("household_id").references(() => households.id, { onDelete: 'cascade' }),
  masterId: text("master_id").references(() => masterIngredients.id),
  dishName: text("dish_name"), // for leftovers only
  cookedFromRecipeId: text("cooked_from_recipe_id"),
  status: text("status").notNull().default("SEALED"), // SEALED, OPEN, LOW, EMPTY, DELETED
  purchaseUnit: text("purchase_unit"), // bag, carton, bottle, bunch, can, box, piece
  source: text("source").notNull(), // vision, manual, cooked
  confidence: text("confidence"), // high, medium, low
  visionJobId: text("vision_job_id"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contents = pgTable("contents", {
  id: text("id").primaryKey(),
  containerId: text("container_id").notNull().unique().references(() => containers.id, { onDelete: "cascade" }),
  remainingQty: real("remaining_qty").notNull(),
  unit: text("unit").notNull(), // g, ml, count, cups, serving, portion
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit trail
export const transactions = pgTable("transactions", {
  id: text("id").primaryKey(),
  householdId: uuid("household_id").references(() => households.id, { onDelete: 'cascade' }),
  containerId: text("container_id").notNull().references(() => containers.id),
  operation: text("operation").notNull(), // ADD, DEDUCT, ADJUST, MERGE, DELETE, STATUS_CHANGE
  delta: real("delta"),
  unit: text("unit"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Recipe history
export const cookedRecipes = pgTable("cooked_recipes", {
  id: text("id").primaryKey(),
  householdId: uuid("household_id").references(() => households.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  ingredientsUsed: text("ingredients_used"), // JSON string
  leftoversCreatedId: text("leftovers_created_id").references(() => containers.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const masterIngredientsRelations = relations(masterIngredients, ({ many }) => ({
  aliases: many(ingredientAliases),
  containers: many(containers),
}));

export const ingredientAliasesRelations = relations(ingredientAliases, ({ one }) => ({
  master: one(masterIngredients, {
    fields: [ingredientAliases.masterId],
    references: [masterIngredients.id],
  }),
}));

export const containersRelations = relations(containers, ({ one, many }) => ({
  master: one(masterIngredients, {
    fields: [containers.masterId],
    references: [masterIngredients.id],
  }),
  contents: one(contents),
  transactions: many(transactions),
}));

export const contentsRelations = relations(contents, ({ one }) => ({
  container: one(containers, {
    fields: [contents.containerId],
    references: [containers.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  container: one(containers, {
    fields: [transactions.containerId],
    references: [containers.id],
  }),
}));

export const cookedRecipesRelations = relations(cookedRecipes, ({ one }) => ({
  leftovers: one(containers, {
    fields: [cookedRecipes.leftoversCreatedId],
    references: [containers.id],
  }),
}));

// Type exports
export type Household = typeof households.$inferSelect;
export type NewHousehold = typeof households.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type MasterIngredient = typeof masterIngredients.$inferSelect;
export type NewMasterIngredient = typeof masterIngredients.$inferInsert;
export type Container = typeof containers.$inferSelect;
export type NewContainer = typeof containers.$inferInsert;
export type Contents = typeof contents.$inferSelect;
export type NewContents = typeof contents.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type CookedRecipe = typeof cookedRecipes.$inferSelect;
