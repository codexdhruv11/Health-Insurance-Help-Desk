import { test, expect } from '@playwright/test';

test.describe('Quote Page', () => {
  test('should allow user to get a quote', async ({ page }) => {
    await page.goto('/quote');

    // Fill out the form
    await page.locator('input[name="age"]').fill('35');
    await page.locator('input[name="location.city"]').fill('Mumbai');
    await page.locator('input[name="location.state"]').fill('Maharashtra');

    // Add a family member
    await page.getByRole('button', { name: 'Add Family Member' }).click();
    await page.locator('select[name="familyMembers.0.relationship"]').selectOption('Spouse');
    await page.locator('input[name="familyMembers.0.age"]').fill('32');

    // Submit the form
    await page.getByRole('button', { name: 'Get Quotes' }).click();

    // Check for quote results
    await expect(page.locator('text=Your Quotes')).toBeVisible();
    await expect(page.locator('.quote-card')).toHaveCount(1);
  });
});