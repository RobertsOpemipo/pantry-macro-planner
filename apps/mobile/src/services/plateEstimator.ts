export interface DecomposedItem {
  id: string;
  name: string;
  category: 'rice' | 'swallow' | 'soup_stew' | 'protein' | 'side';
  grams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

// Nigerian Portion Presets for 100% Offline Mode
export const OFFLINE_NIGERIAN_PRESETS: { label: string; components: DecomposedItem[] }[] = [
  {
    label: 'Party Combo (Jollof + Dodo + Chicken)',
    components: [
      {
        id: '1',
        name: 'Nigerian Party Jollof Rice',
        category: 'rice',
        grams: 220,
        caloriesPer100g: 170,
        proteinPer100g: 3.8,
        carbsPer100g: 28.5,
        fatPer100g: 4.8,
      },
      {
        id: '2',
        name: 'Fried Ripe Plantain (Dodo)',
        category: 'side',
        grams: 60,
        caloriesPer100g: 235,
        proteinPer100g: 1.4,
        carbsPer100g: 36.0,
        fatPer100g: 10.2,
      },
      {
        id: '3',
        name: 'Fried Chicken (Nigerian Buka Style)',
        category: 'protein',
        grams: 110,
        caloriesPer100g: 245,
        proteinPer100g: 24.0,
        carbsPer100g: 1.5,
        fatPer100g: 16.0,
      },
    ],
  },
  {
    label: 'Swallow Feast (Pounded Yam + Egusi + Assorted)',
    components: [
      {
        id: '4',
        name: 'Pounded Yam (Cooked Swallow)',
        category: 'swallow',
        grams: 250,
        caloriesPer100g: 120,
        proteinPer100g: 1.5,
        carbsPer100g: 28.0,
        fatPer100g: 0.2,
      },
      {
        id: '5',
        name: 'Egusi Soup (Melon Seed & Spinach)',
        category: 'soup_stew',
        grams: 150,
        caloriesPer100g: 215,
        proteinPer100g: 9.0,
        carbsPer100g: 4.5,
        fatPer100g: 18.0,
      },
      {
        id: '6',
        name: 'Cooked Assorted Meat: Shaki (Tripe)',
        category: 'protein',
        grams: 80,
        caloriesPer100g: 125,
        proteinPer100g: 18.0,
        carbsPer100g: 0.0,
        fatPer100g: 5.5,
      },
    ],
  },
  {
    label: 'Light Dinner (Amala + Efo Riro + Fish/Ponmo)',
    components: [
      {
        id: '7',
        name: 'Amala Dudu (Cooked Yam Flour)',
        category: 'swallow',
        grams: 200,
        caloriesPer100g: 105,
        proteinPer100g: 1.8,
        carbsPer100g: 24.0,
        fatPer100g: 0.2,
      },
      {
        id: '8',
        name: 'Efo Riro (Rich Spinach Stew)',
        category: 'soup_stew',
        grams: 140,
        caloriesPer100g: 145,
        proteinPer100g: 8.2,
        carbsPer100g: 3.8,
        fatPer100g: 10.5,
      },
      {
        id: '9',
        name: 'Cooked Assorted Meat: Ponmo (Cow Skin)',
        category: 'protein',
        grams: 70,
        caloriesPer100g: 65,
        proteinPer100g: 8.5,
        carbsPer100g: 0.0,
        fatPer100g: 3.0,
      },
    ],
  },
];

export function computeTotalPlateMacros(items: DecomposedItem[]) {
  return items.reduce(
    (acc, item) => {
      const factor = item.grams / 100;
      acc.calories += factor * item.caloriesPer100g;
      acc.protein += factor * item.proteinPer100g;
      acc.carbs += factor * item.carbsPer100g;
      acc.fat += factor * item.fatPer100g;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}