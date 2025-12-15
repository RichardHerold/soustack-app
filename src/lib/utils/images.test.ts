import { describe, expect, it } from 'vitest';
import type { SoustackRecipe } from '$lib/db';
import {
  detectImagePattern,
  getAllImages,
  getPrimaryImage,
  getStepImages
} from './images';

function buildRecipe(overrides: Partial<SoustackRecipe> = {}): SoustackRecipe {
  return {
    soustack: '0.1',
    name: 'Test Recipe',
    ingredients: ['1 cup flour'],
    instructions: ['Mix ingredients'],
    ...overrides
  };
}

describe('image utilities', () => {
  it('detects hero pattern when only recipe image exists', () => {
    const recipe = buildRecipe({ image: 'hero.jpg' });
    expect(detectImagePattern(recipe)).toBe('hero');
  });

  it('detects step-by-step pattern when only step images exist', () => {
    const recipe = buildRecipe({
      instructions: [
        'Mix ingredients',
        { step: 'Bake', image: 'step.jpg' }
      ]
    });
    expect(detectImagePattern(recipe)).toBe('step-by-step');
  });

  it('detects hybrid pattern when hero and steps have images', () => {
    const recipe = buildRecipe({
      image: ['hero.jpg'],
      instructions: [
        'Mix ingredients',
        { step: 'Bake', image: 'step.jpg' }
      ]
    });
    expect(detectImagePattern(recipe)).toBe('hybrid');
  });

  it('returns none when no images exist', () => {
    expect(detectImagePattern(buildRecipe())).toBe('none');
  });

  it('returns first image as primary', () => {
    const recipe = buildRecipe({ image: ['first.jpg', 'second.jpg'] });
    expect(getPrimaryImage(recipe)).toBe('first.jpg');
  });

  it('returns all images as array', () => {
    const recipe = buildRecipe({ image: ['one.jpg', 'two.jpg'] });
    expect(getAllImages(recipe)).toEqual(['one.jpg', 'two.jpg']);
    expect(getAllImages(buildRecipe({ image: 'solo.jpg' }))).toEqual(['solo.jpg']);
  });

  it('maps step indexes to images', () => {
    const recipe = buildRecipe({
      instructions: [
        { step: 'Prep', image: 'prep.jpg' },
        'Mix',
        { step: 'Bake', image: 'bake.jpg' }
      ]
    });

    const stepImages = getStepImages(recipe);
    expect(stepImages.get(0)).toBe('prep.jpg');
    expect(stepImages.has(1)).toBe(false);
    expect(stepImages.get(2)).toBe('bake.jpg');
  });
});
