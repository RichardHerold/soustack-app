import type { SoustackRecipe, SoustackInstruction } from '$lib/db';

export type ImagePattern = 'hero' | 'step-by-step' | 'hybrid' | 'none';

function hasStepImage(instruction: string | SoustackInstruction): boolean {
  return typeof instruction !== 'string' && !!instruction.image;
}

/**
 * Detect which image pattern a recipe uses.
 * Images are an enhancement, so we only opt into patterns when assets exist.
 */
export function detectImagePattern(recipe: SoustackRecipe): ImagePattern {
  const hasRecipeImage = !!recipe.image;
  const hasStepImages = recipe.instructions.some(hasStepImage);

  if (hasRecipeImage && hasStepImages) return 'hybrid';
  if (hasRecipeImage) return 'hero';
  if (hasStepImages) return 'step-by-step';
  return 'none';
}

/**
 * Get the primary display image (first if array).
 */
export function getPrimaryImage(recipe: SoustackRecipe): string | undefined {
  if (!recipe.image) return undefined;
  return Array.isArray(recipe.image) ? recipe.image[0] : recipe.image;
}

/**
 * Get all recipe images as array.
 */
export function getAllImages(recipe: SoustackRecipe): string[] {
  if (!recipe.image) return [];
  return Array.isArray(recipe.image) ? recipe.image : [recipe.image];
}

/**
 * Get map of step index to image URL.
 */
export function getStepImages(recipe: SoustackRecipe): Map<number, string> {
  const images = new Map<number, string>();

  recipe.instructions.forEach((inst, index) => {
    if (typeof inst !== 'string' && inst.image) {
      images.set(index, inst.image);
    }
  });

  return images;
}
