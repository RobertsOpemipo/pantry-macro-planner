export interface SmartSwapRecommendation {
  alternativeName: string;
  brandOrSource: string;
  reason: string;
  macroBenefit: string;
}

export function getNigerianSmartSwap(
  foodName: string,
  brand?: string,
  goal: 'hypertrophy' | 'cut' = 'hypertrophy'
): SmartSwapRecommendation | null {
  const lower = (foodName + ' ' + (brand || '')).toLowerCase();

  // 1. Garri / Cassava Swaps
  if (lower.includes('yellow garri') || lower.includes('delta')) {
    return {
      alternativeName: 'Ijebu White Garri or Plantain Flour',
      brandOrSource: 'Local Market / Ayoola',
      reason: 'Yellow garri is pan-fried with palm oil, adding ~3.8g unmeasured fats per 100g.',
      macroBenefit: 'Saves 25-35 kcal per 100g and keeps added saturated fats lower.',
    };
  }

  // 2. Poundo / Heavy Starch Swaps
  if (lower.includes('poundo') || lower.includes('pounded yam')) {
    if (goal === 'cut') {
      return {
        alternativeName: 'Amala (Yam Flour) or Unripe Plantain Flour',
        brandOrSource: 'Local Market / Ayoola',
        reason: 'Poundo flour has a high glycemic index. Amala has more resistant starch and keeps hunger down.',
        macroBenefit: 'Saves ~32 kcal per 100g with higher satiety.',
      };
    }
    return {
      alternativeName: 'Golden Penny Wheat Meal or Semovita',
      brandOrSource: 'Flour Mills of Nigeria',
      reason: 'Standard poundo has only ~2.8g protein per 100g. Wheat Meal provides ~12.5g protein.',
      macroBenefit: '+9.7g protein per 100g portion directly from your swallow.',
    };
  }

  // 3. Rice Swaps
  if (
    lower.includes('parboiled') ||
    lower.includes('mama gold') ||
    lower.includes('royal stallion') ||
    lower.includes('big bull')
  ) {
    return {
      alternativeName: 'Local Ofada / Abakaliki Rice or Basmati Rice',
      brandOrSource: 'Local Market / Royal Sella',
      reason: 'Unpolished local rice retains bran fiber, while Basmati has lower starch stickiness and lower GI.',
      macroBenefit: '+2g fiber and steadier blood sugar levels after large jollof or stew portions.',
    };
  }

  // 4. Instant Noodles
  if (lower.includes('indomie') || lower.includes('noodles')) {
    return {
      alternativeName: 'Golden Penny Spaghetti + Boiled Egg/Crayfish',
      brandOrSource: 'Golden Penny',
      reason: 'Instant noodle cakes are flash-fried in palm oil during processing (16-20g fat). Unfried pasta has <2g fat.',
      macroBenefit: 'Cuts fat by >75% and lets you control healthy oils directly.',
    };
  }

  return null;
}