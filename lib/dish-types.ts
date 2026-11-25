export type DishIngredient = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  weight: string;
  weightUnit: "g" | "kg" | "mg";
};

export type InstructionsContent = string | Record<string, unknown>;

export type Dish = {
  id: string;
  name: string;
  category: string;
  ingredients: string | DishIngredient[];
  previousIngredients?: string;
  instructions: InstructionsContent;
  minutes: string;
  servings?: string;
  baseServings?: number;
  notes: string;
};
