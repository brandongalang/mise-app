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

// ============================================
// MEAL PLANNING: Recipes, Plans, Grocery Lists
// ============================================

// Saved Recipes - user's recipe library
export const savedRecipes = pgTable("saved_recipes", {
  id: text("id").primaryKey(),
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  description: text("description"),
  ingredients: text("ingredients").notNull(), // Free-text, AI-formatted
  steps: text("steps").notNull(), // Free-text, AI-formatted
  timeMinutes: integer("time_minutes"),
  servings: integer("servings").notNull().default(4),
  tags: text("tags"), // JSON array as string: ["quick", "vegetarian"]
  notes: text("notes"), // User notes: "Use less salt next time"
  isFavorite: boolean("is_favorite").default(false),
  timesCooked: integer("times_cooked").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  lastCookedAt: timestamp("last_cooked_at"),
});

// Meal Plans - one per week
export const mealPlans = pgTable("meal_plans", {
  id: text("id").primaryKey(),
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: 'cascade' }),
  weekStart: timestamp("week_start").notNull(), // Monday of the week
  createdAt: timestamp("created_at").defaultNow(),
});

// Planned Meals - individual meal slots
export const plannedMeals = pgTable("planned_meals", {
  id: text("id").primaryKey(),
  mealPlanId: text("meal_plan_id").notNull().references(() => mealPlans.id, { onDelete: 'cascade' }),
  date: timestamp("date").notNull(), // Which day
  mealType: text("meal_type").notNull(), // breakfast, lunch, dinner
  recipeId: text("recipe_id").references(() => savedRecipes.id, { onDelete: 'set null' }), // From library
  quickMeal: text("quick_meal"), // If not a recipe: "leftovers", "eating out"
  servings: integer("servings").notNull().default(2), // How many servings to make (for scaling)
  status: text("status").notNull().default("planned"), // planned, cooked, skipped
  cookedAt: timestamp("cooked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Grocery Lists - generated from meal plans
export const groceryLists = pgTable("grocery_lists", {
  id: text("id").primaryKey(),
  householdId: uuid("household_id").notNull().references(() => households.id, { onDelete: 'cascade' }),
  mealPlanId: text("meal_plan_id").references(() => mealPlans.id, { onDelete: 'set null' }),
  status: text("status").notNull().default("active"), // active, shopping, completed
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Grocery Items - individual items on a list
export const groceryItems = pgTable("grocery_items", {
  id: text("id").primaryKey(),
  listId: text("list_id").notNull().references(() => groceryLists.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  category: text("category"), // produce, protein, dairy, pantry, frozen, bakery, other
  isChecked: boolean("is_checked").default(false),
  source: text("source").notNull(), // recipe, manual, low_stock
  createdAt: timestamp("created_at").defaultNow(),
});

// Meal Planning Relations
export const savedRecipesRelations = relations(savedRecipes, ({ one, many }) => ({
  household: one(households, {
    fields: [savedRecipes.householdId],
    references: [households.id],
  }),
  plannedMeals: many(plannedMeals),
}));

export const mealPlansRelations = relations(mealPlans, ({ one, many }) => ({
  household: one(households, {
    fields: [mealPlans.householdId],
    references: [households.id],
  }),
  plannedMeals: many(plannedMeals),
  groceryLists: many(groceryLists),
}));

export const plannedMealsRelations = relations(plannedMeals, ({ one }) => ({
  mealPlan: one(mealPlans, {
    fields: [plannedMeals.mealPlanId],
    references: [mealPlans.id],
  }),
  recipe: one(savedRecipes, {
    fields: [plannedMeals.recipeId],
    references: [savedRecipes.id],
  }),
}));

export const groceryListsRelations = relations(groceryLists, ({ one, many }) => ({
  household: one(households, {
    fields: [groceryLists.householdId],
    references: [households.id],
  }),
  mealPlan: one(mealPlans, {
    fields: [groceryLists.mealPlanId],
    references: [mealPlans.id],
  }),
  items: many(groceryItems),
}));

export const groceryItemsRelations = relations(groceryItems, ({ one }) => ({
  list: one(groceryLists, {
    fields: [groceryItems.listId],
    references: [groceryLists.id],
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

// Meal Planning Types
export type SavedRecipe = typeof savedRecipes.$inferSelect;
export type NewSavedRecipe = typeof savedRecipes.$inferInsert;
export type MealPlan = typeof mealPlans.$inferSelect;
export type NewMealPlan = typeof mealPlans.$inferInsert;
export type PlannedMeal = typeof plannedMeals.$inferSelect;
export type NewPlannedMeal = typeof plannedMeals.$inferInsert;
export type GroceryList = typeof groceryLists.$inferSelect;
export type NewGroceryList = typeof groceryLists.$inferInsert;
export type GroceryItem = typeof groceryItems.$inferSelect;
export type NewGroceryItem = typeof groceryItems.$inferInsert;
