import { test, expect } from '@playwright/test';

test.describe('Checkout Page', () => {
  test('should allow user to fill out checkout form', async ({ page }) => {
    // This test assumes the user has already selected a quote and is on the checkout page
    // A more robust test would navigate from the quote page to the checkout page
    await page.goto('/checkout?planId=1'); // Assuming a plan has been selected

    // Fill out personal details
    await page.locator('input[name="firstName"]').fill('John');
    await page.locator('input[name="lastName"]').fill('Doe');
    await page.locator('input[name="email"]').fill('john.doe@example.com');
    await page.locator('input[name="phone"]').fill('1234567890');

    // Fill out nominee details
    await page.locator('input[name="nominee.firstName"]').fill('Jane');
    await page.locator('input[name="nominee.lastName"]').fill('Doe');
    await page.locator('select[name="nominee.relationship"]').selectOption('Spouse');

    // Add a family member
    await page.getByRole('button', { name: 'Add Family Member' }).click();
    await page.locator('input[name="familyMembers.0.firstName"]').fill('Sam');
    await page.locator('input[name="familyMembers.0.lastName"]').fill('Doe');
    await page.locator('input[name="familyMembers.0.dob"]').fill('2010-05-20');

    // Submit the form
    await page.getByRole('button', { name: 'Proceed to Payment' }).click();

    // Expect to be redirected to a payment page (mocked in a real test environment)
    await expect(page).toHaveURL(/.*payment/);
  });
});