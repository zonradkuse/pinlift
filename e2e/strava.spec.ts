import { test, expect } from './fixtures.ts';
import { finishWorkout, logSets } from './helpers.ts';

const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,content-type' };

test('connect Strava via OAuth and post a finished workout', async ({ page }) => {
  let activity: Record<string, unknown> | undefined;
  await page.route('https://www.strava.com/oauth/authorize**', (route) => {
    const u = new URL(route.request().url());
    expect(u.searchParams.get('scope')).toBe('activity:write');
    const back = `${u.searchParams.get('redirect_uri')}?state=${u.searchParams.get('state')}&code=abc&scope=read,activity:write`;
    return route.fulfill({ status: 302, headers: { location: back } });
  });
  await page.route('https://www.strava.com/oauth/token', (route) => {
    const body = new URLSearchParams(route.request().postData() ?? '');
    expect(body.get('code')).toBe('abc');
    expect(body.get('client_secret')).toBe('s3cret');
    return route.fulfill({ headers: cors, json: { access_token: 'AT', refresh_token: 'RT', expires_at: Math.floor(Date.now() / 1000) + 3600,
      athlete: { firstname: 'Test', lastname: 'User' } } });
  });
  await page.route('https://www.strava.com/api/v3/activities', (route) => {
    if (route.request().method() === 'OPTIONS') return route.fulfill({ headers: cors });
    expect(route.request().headers().authorization).toBe('Bearer AT');
    activity = route.request().postDataJSON();
    return route.fulfill({ headers: cors, json: { id: 123 } });
  });

  await page.goto('./#/settings');
  await page.getByLabel('Client ID').fill('42');
  await page.getByLabel('Client secret').fill('s3cret');
  await page.getByRole('button', { name: 'Connect Strava' }).click();
  await expect(page.getByText(/Connected as Test User/)).toBeVisible();

  await logSets(page, 'leg-press', [[100, 10]]);
  await finishWorkout(page);
  await page.getByRole('button', { name: 'Post to Strava' }).click();
  await expect(page.getByRole('link', { name: 'On Strava' })).toHaveAttribute('href', 'https://www.strava.com/activities/123');
  expect(activity).toMatchObject({ sport_type: 'WeightTraining', name: 'Strength workout', trainer: 1 });
  expect(activity!.description).toContain('Total lifted: 1,000 kg');
});

test('Strava redirect landing in another storage context shows the code to copy', async ({ page }) => {
  await page.goto('./?state=strava-OTHER&code=xyz123&scope=read,activity:write');
  await expect(page.getByTestId('strava-code')).toHaveText('xyz123');
});
