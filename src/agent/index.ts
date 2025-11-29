// Agent Tools Export Module
// Exports all inventory management tools for use in the application

export {
  searchInventory,
  addInventory,
  addLeftover,
  updateInventory,
  deductInventory,
  deleteInventory,
  mergeInventory,
  getExpiringItems,
  checkDuplicates,
  registerAlias,
  resolveIngredient,
} from './tools/inventory';

// Re-export signatures for AI extraction
export { parseImage } from './signatures/parseImage';
export { generateRecipe } from './signatures/generateRecipe';
