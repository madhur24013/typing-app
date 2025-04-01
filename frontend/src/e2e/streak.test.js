import { test, expect } from '@playwright/test';

test.describe('Streak System', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('completes a typing session and updates streak', async ({ page }) => {
    // Navigate to typing practice
    await page.goto('/practice');
    
    // Complete a typing session
    await page.fill('[data-testid="typing-input"]', 'The quick brown fox jumps over the lazy dog.');
    await page.click('[data-testid="submit-button"]');
    
    // Verify streak update
    await page.waitForSelector('[data-testid="streak-counter"]');
    const streakText = await page.textContent('[data-testid="streak-counter"]');
    expect(streakText).toContain('1');
    
    // Check for streak animation
    await expect(page.locator('[data-testid="streak-animation"]')).toBeVisible();
  });

  test('maintains streak for multiple days', async ({ page }) => {
    // Complete first day
    await page.goto('/practice');
    await page.fill('[data-testid="typing-input"]', 'First day practice.');
    await page.click('[data-testid="submit-button"]');
    
    // Simulate next day
    await page.evaluate(() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      localStorage.setItem('lastActivityDate', tomorrow.toISOString());
    });
    
    // Complete second day
    await page.goto('/practice');
    await page.fill('[data-testid="typing-input"]', 'Second day practice.');
    await page.click('[data-testid="submit-button"]');
    
    // Verify streak increased
    const streakText = await page.textContent('[data-testid="streak-counter"]');
    expect(streakText).toContain('2');
  });

  test('loses streak after missing a day', async ({ page }) => {
    // Complete first day
    await page.goto('/practice');
    await page.fill('[data-testid="typing-input"]', 'First day practice.');
    await page.click('[data-testid="submit-button"]');
    
    // Simulate missing a day
    await page.evaluate(() => {
      const twoDaysLater = new Date();
      twoDaysLater.setDate(twoDaysLater.getDate() + 2);
      localStorage.setItem('lastActivityDate', twoDaysLater.toISOString());
    });
    
    // Complete practice after missing a day
    await page.goto('/practice');
    await page.fill('[data-testid="typing-input"]', 'Practice after missing a day.');
    await page.click('[data-testid="submit-button"]');
    
    // Verify streak reset
    const streakText = await page.textContent('[data-testid="streak-counter"]');
    expect(streakText).toContain('1');
    
    // Check for streak loss notification
    await expect(page.locator('[data-testid="streak-loss-notification"]')).toBeVisible();
  });

  test('creates and responds to streak battle', async ({ page }) => {
    // Navigate to battles section
    await page.goto('/battles');
    
    // Create a new battle
    await page.click('[data-testid="create-battle-button"]');
    await page.selectOption('[data-testid="opponent-select"]', 'user2');
    await page.selectOption('[data-testid="duration-select"]', '7');
    await page.click('[data-testid="start-battle-button"]');
    
    // Verify battle created
    await expect(page.locator('[data-testid="battle-created-notification"]')).toBeVisible();
    
    // Switch to opponent's perspective
    await page.evaluate(() => {
      localStorage.setItem('userId', 'user2');
    });
    
    // Respond to battle
    await page.goto('/battles');
    await page.click('[data-testid="accept-battle-button"]');
    
    // Verify battle accepted
    await expect(page.locator('[data-testid="battle-accepted-notification"]')).toBeVisible();
  });

  test('claims streak rewards', async ({ page }) => {
    // Complete enough sessions to earn a reward
    for (let i = 0; i < 5; i++) {
      await page.goto('/practice');
      await page.fill('[data-testid="typing-input"]', `Practice session ${i + 1}`);
      await page.click('[data-testid="submit-button"]');
      
      // Simulate next day
      await page.evaluate(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        localStorage.setItem('lastActivityDate', tomorrow.toISOString());
      });
    }
    
    // Navigate to rewards
    await page.goto('/rewards');
    
    // Claim available reward
    await page.click('[data-testid="claim-reward-button"]');
    
    // Verify reward claimed
    await expect(page.locator('[data-testid="reward-claimed-notification"]')).toBeVisible();
  });

  test('uses streak freeze', async ({ page }) => {
    // Navigate to streak freezes
    await page.goto('/freezes');
    
    // Purchase a freeze
    await page.click('[data-testid="purchase-freeze-button"]');
    await page.selectOption('[data-testid="freeze-duration-select"]', '24');
    await page.click('[data-testid="confirm-purchase-button"]');
    
    // Verify freeze purchased
    await expect(page.locator('[data-testid="freeze-purchased-notification"]')).toBeVisible();
    
    // Simulate missing a day with freeze active
    await page.evaluate(() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      localStorage.setItem('lastActivityDate', tomorrow.toISOString());
      localStorage.setItem('activeFreeze', 'true');
    });
    
    // Complete practice
    await page.goto('/practice');
    await page.fill('[data-testid="typing-input"]', 'Practice with freeze active.');
    await page.click('[data-testid="submit-button"]');
    
    // Verify streak maintained
    const streakText = await page.textContent('[data-testid="streak-counter"]');
    expect(streakText).toContain('1');
  });

  test('joins and participates in team streak', async ({ page }) => {
    // Navigate to teams
    await page.goto('/teams');
    
    // Join a team
    await page.click('[data-testid="join-team-button"]');
    await page.selectOption('[data-testid="team-select"]', 'Team A');
    await page.click('[data-testid="confirm-join-button"]');
    
    // Verify team joined
    await expect(page.locator('[data-testid="team-joined-notification"]')).toBeVisible();
    
    // Complete practice
    await page.goto('/practice');
    await page.fill('[data-testid="typing-input"]', 'Team practice session.');
    await page.click('[data-testid="submit-button"]');
    
    // Verify team streak updated
    await expect(page.locator('[data-testid="team-streak-counter"]')).toBeVisible();
  });

  test('views streak analytics', async ({ page }) => {
    // Navigate to analytics
    await page.goto('/analytics');
    
    // Verify analytics components
    await expect(page.locator('[data-testid="weekly-activity-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="streak-distribution-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="personal-stats"]')).toBeVisible();
  });
}); 