import puppeteer from 'puppeteer';
import dotenv from 'dotenv';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Load environment variables
dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL;
const LOGIN_URL = process.env.LOGIN_URL;

// Fetch accounts without cookies
async function fetchAccounts() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/capcut-accounts/without-cookie`);
    if (!response.ok) {
      throw new Error(`Failed to fetch accounts: ${response.statusText}`);
    }
    const accounts = await response.json();
    return accounts;
  } catch (error) {
    console.error('Error fetching accounts:', error);
    throw error;
  }
}

// Login to CapCut and extract cookies
async function loginAndGetCookies(email, password) {
  let browser;
  try {
    // Launch browser
    // Run in headless mode in CI environments (like GitHub Actions)
    const isHeadless = process.env.CI === 'true' || process.env.PUPPETEER_HEADLESS === 'true';
    browser = await puppeteer.launch({
      headless: isHeadless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate to login page
    console.log(`Navigating to ${LOGIN_URL}...`);
    await page.goto(LOGIN_URL, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for email input and enter email
    console.log('Entering email...');
    await page.waitForSelector('input[name="signUsername"]', { timeout: 10000 });
    await page.type('input[name="signUsername"]', email, { delay: 100 });

    // Click the first button (to proceed to password step)
    console.log('Clicking continue button...');
    await page.waitForSelector('.lv_sign_in_panel_wide-primary-button', { timeout: 10000 });
    await page.click('.lv_sign_in_panel_wide-primary-button');
    
    // Wait for navigation/transition
    await sleep(2000);

    // Wait for password input and enter password
    console.log('Entering password...');
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    await page.type('input[type="password"]', password, { delay: 100 });

    // Click the login button
    console.log('Clicking login button...');
    await page.waitForSelector('.lv_sign_in_panel_wide-primary-button', { timeout: 10000 });
    await page.click('.lv_sign_in_panel_wide-primary-button');

    // Wait for login to complete (wait for navigation or specific element)
    console.log('Waiting for login to complete...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

    // Get cookies
    console.log('Extracting cookies...');
    const allCookies = await page.cookies();
    
    if (allCookies.length === 0) {
      throw new Error('No cookies found after login');
    }
    
    console.log(`Found ${allCookies.length} cookie(s)`);
    
    // Transform cookies to the required format
    const formattedCookies = allCookies.map(cookie => {
      // Determine hostOnly: true if domain doesn't start with '.'
      const hostOnly = !cookie.domain.startsWith('.');
      
      // Determine session: true if expires is -1 or undefined
      const isSession = !cookie.expires || cookie.expires === -1;
      
      // Convert sameSite to the expected format
      let sameSite = 'unspecified';
      if (cookie.sameSite) {
        const sameSiteLower = cookie.sameSite.toLowerCase();
        if (sameSiteLower === 'none') {
          sameSite = 'no_restriction';
        } else if (sameSiteLower === 'lax' || sameSiteLower === 'strict') {
          sameSite = sameSiteLower;
        }
      }
      
      // Format the cookie object
      const formattedCookie = {
        domain: cookie.domain,
        hostOnly: hostOnly,
        httpOnly: cookie.httpOnly || false,
        name: cookie.name,
        path: cookie.path || '/',
        sameSite: sameSite,
        secure: cookie.secure || false,
        session: isSession,
        storeId: '0',
        value: cookie.value
      };
      
      // Add expirationDate only if it's not a session cookie
      if (!isSession && cookie.expires) {
        formattedCookie.expirationDate = cookie.expires;
      }
      
      return formattedCookie;
    });
    
    // Find the expiration date from cookies (use the longest expiration date)
    let expireDate = null;
    if (allCookies.length > 0) {
      const maxExpiration = Math.max(...allCookies.map(c => c.expires || 0).filter(exp => exp > 0));
      if (maxExpiration > 0) {
        expireDate = new Date(maxExpiration * 1000).toISOString();
      }
    }

    console.log('Formatted cookies:', formattedCookies);

    return {
      url: 'https://www.capcut.com',
      cookies: formattedCookies,
      expire_date: expireDate
    };
  } catch (error) {
    console.error(`Error during login for ${email}:`, error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Upload cookies to API
async function uploadCookies(accountId, cookieData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/capcut-accounts/${accountId}/cookie`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cookieData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload cookies: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Error uploading cookies for account ${accountId}:`, error);
    throw error;
  }
}

// Process a single account
async function processAccount(account) {
  console.log(`\nProcessing account:`, account);
  
  try {
    // Login and get cookies
    const cookieData = await loginAndGetCookies(account.email, account.password);
    
    // Upload cookies to API
    console.log(`Uploading cookies for account ${account.id}...`);
    await uploadCookies(account.id, cookieData);
    
    console.log(`✓ Successfully processed account ${account.id}`);
    return { success: true, accountId: account.id };
  } catch (error) {
    console.error(`✗ Failed to process account ${account.id}:`, error.message);
    return { success: false, accountId: account.id, error: error.message };
  }
}

// Main function
async function main() {
  console.log('Starting CapCut cookie refresh process...\n');

  try {
    // Fetch accounts
    console.log('Fetching accounts without cookies...');
    const accounts = await fetchAccounts();
    console.log(`Found ${accounts.length} account(s) to process\n`);

    if (accounts.length === 0) {
      console.log('No accounts to process. Exiting.');
      return;
    }

    // Process each account sequentially
    const results = [];
    for (const account of accounts) {
      const result = await processAccount(account);
      results.push(result);
      
      // Add a small delay between accounts to avoid rate limiting
      if (accounts.indexOf(account) < accounts.length - 1) {
        console.log('Waiting 3 seconds before next account...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    // Summary
    console.log('\n=== Summary ===');
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    console.log(`Total: ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);

    if (failed > 0) {
      console.log('\nFailed accounts:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - Account ${r.accountId}: ${r.error}`);
      });
    }

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
