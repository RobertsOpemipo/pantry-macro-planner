import { FoodItem } from './api';

export type FitnessGoal = 'hypertrophy' | 'cut' | 'maintenance';

export interface MacroVerdict {
  score: 'great' | 'good' | 'moderate' | 'caution';
  badgeTitle: string;
  badgeColor: string;
  bgColor: string;
  pCalRatio: number;
  calorieDensity: number;
  summary: string;
  tips: string[];
}

export function evaluateNutritionFit(
  food: FoodItem,
  goal: FitnessGoal = 'hypertrophy'
): MacroVerdict {
  const calories = Number(food.calories_per_100g) || 1;
  const protein = Number(food.protein_per_100g) || 0;
  const carbs = Number(food.carbs_per_100g) || 0;
  const fat = Number(food.fat_per_100g) || 0;

  // 1. Protein-to-Calorie Ratio (g of protein per 100 kcal)
  const pCal = (protein / calories) * 100;
  const roundedPCal = Math.round(pCal * 10) / 10;

  // 2. Caloric Density (kcal per 100g)
  const density = Math.round(calories);

  let score: MacroVerdict['score'] = 'moderate';
  let badgeTitle = 'Energy Source';
  let badgeColor = '#38bdf8';
  let bgColor = 'rgba(56, 189, 248, 0.12)';
  let summary = '';
  const tips: string[] = [];

  // Evaluate based on Protein-to-Calorie & Energy Density
  if (roundedPCal >= 10) {
    score = 'great';
    badgeTitle = '🟢 Top-Tier Protein Anchor';
    badgeColor = '#22c55e';
    bgColor = 'rgba(34, 197, 94, 0.14)';
    summary = `Exceptional muscle-building efficiency (${roundedPCal}g protein per 100 kcal).`;
    tips.push('Delivers high amino acid availability with virtually zero fat or carb penalty.');
  } else if (roundedPCal >= 5.5) {
    score = 'good';
    badgeTitle = '🔵 Balanced Macro Contributor';
    badgeColor = '#38bdf8';
    bgColor = 'rgba(56, 189, 248, 0.14)';
    summary = `Solid protein contributor (${roundedPCal}g protein / 100 kcal).`;
    tips.push('Good staple for muscle recovery when balanced with daily fats and carbs.');
  } else if (density >= 450) {
    score = 'caution';
    badgeTitle = '🟠 Calorie Dense — Weigh Accurately';
    badgeColor = '#f97316';
    bgColor = 'rgba(249, 115, 22, 0.14)';
    summary = `Very high caloric density (${density} kcal / 100g).`;
    tips.push('Easy to overshoot daily calorie goals. Weigh portions on a digital scale.');
  } else {
    score = 'moderate';
    badgeTitle = '🟡 Glycogen & Energy Fuel';
    badgeColor = '#eab308';
    bgColor = 'rgba(234, 179, 8, 0.14)';
    summary = `Primary carbohydrate or fat energy source (${carbs}g carbs / ${fat}g fat).`;
    tips.push('Excellent workout fuel. Pair with a high-protein anchor to balance the meal.');
  }

  // Goal-specific advice
  if (goal === 'hypertrophy' && roundedPCal < 4 && density < 300) {
    tips.push('To hit hypertrophy targets, combine with eggs, milk, fish, or whey.');
  } else if (goal === 'cut' && density >= 350) {
    tips.push('Watch satiety: liquid/concentrated fats digest quickly compared to whole foods.');
  }

  return {
    score,
    badgeTitle,
    badgeColor,
    bgColor,
    pCalRatio: roundedPCal,
    calorieDensity: density,
    summary,
    tips,
  };
}