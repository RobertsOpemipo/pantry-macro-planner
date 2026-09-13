import axios from 'axios';
import { getAuthToken } from './storage';

// Your active Cloudflare tunnel URL
const API_BASE_URL = 'https://tue-administrative-colon-last.trycloudflare.com/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, 
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface FoodItem {
  id: string;
  barcode?: string;
  name: string;
  brand?: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  serving_unit: string;
}

export interface CreateFoodInput {
  barcode?: string;
  name: string;
  brand?: string;
  serving_size?: number;
  serving_unit?: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
}

export interface PantryItemResponse {
  id: string;
  user_id: string;
  food_id: string;
  quantity_remaining: number;
  unit: string;
  food?: FoodItem;
  created_at: string;
}

export interface RecipeIngredientInput {
  food_id: string;
  amount: number;
  unit: string;
}

export interface CreateRecipeInput {
  title: string;
  servings: number;
  instructions?: string;
  ingredients: RecipeIngredientInput[];
}

export interface RecipeDetail {
  id: string;
  title: string;
  servings: number;
  instructions: string;
  macros: {
    total_calories: number;
    total_protein: number;
    total_carbs: number;
    total_fat: number;
    calories_per_serving: number;
    protein_per_serving: number;
    carbs_per_serving: number;
    fat_per_serving: number;
  };
}

export async function fetchFoodByBarcode(barcode: string): Promise<FoodItem> {
  const response = await apiClient.get<FoodItem>(`/foods/barcode/${barcode}`);
  return response.data;
}

export async function createFood(input: CreateFoodInput): Promise<FoodItem> {
  const payload = {
    barcode: input.barcode?.trim() || undefined,
    name: input.name.trim(),
    brand: input.brand?.trim() || undefined,
    serving_unit: input.serving_unit || 'g',
    calories_per_100g: Number(input.calories_per_100g) || 0,
    protein_per_100g: Number(input.protein_per_100g) || 0,
    carbs_per_100g: Number(input.carbs_per_100g) || 0,
    fat_per_100g: Number(input.fat_per_100g) || 0,
  };
  const response = await apiClient.post<FoodItem>('/foods', payload);
  return response.data;
}

export async function fetchPantryItems(): Promise<PantryItemResponse[]> {
  const response = await apiClient.get<PantryItemResponse[]>('/pantry');
  return response.data || [];
}

export async function addFoodToPantry(foodId: string, quantity: number, unit: string = 'g') {
  const response = await apiClient.post('/pantry', {
    food_id: foodId,
    quantity_remaining: quantity,
    unit: unit,
    low_stock_threshold: 200,
  });
  return response.data;
}

export async function deletePantryItem(id: string): Promise<void> {
  await apiClient.delete(`/pantry/${id}`);
}

export async function createRecipe(input: CreateRecipeInput): Promise<RecipeDetail> {
  const response = await apiClient.post<RecipeDetail>('/recipes', input);
  return response.data;
}

export async function cookRecipeBatch(recipeId: string, batches: number = 1) {
  const response = await apiClient.post(`/recipes/${recipeId}/cook`, {
    batches_cooked: batches,
  });
  return response.data;
}

export interface DecomposeMealResponse {
  mode: string;
  components: {
    food_name: string;
    estimated_grams: number;
    confidence: number;
    category: 'rice' | 'swallow' | 'soup_stew' | 'protein' | 'side';
  }[];
  note: string;
}

export async function decomposePreparedPlate(base64Image: string): Promise<DecomposeMealResponse> {
  const res = await apiClient.post<DecomposeMealResponse>('/foods/decompose-meal', {
    image_base64: base64Image,
  });
  return res.data;
}