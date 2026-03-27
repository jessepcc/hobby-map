const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const baseUrl = 'http://localhost:8080';
  let failures = 0;

  function assert(condition, msg) {
    if (!condition) {
      console.error('FAIL:', msg);
      failures++;
    } else {
      console.log('PASS:', msg);
    }
  }

  // Collect JS errors
  const jsErrors = [];
  page.on('pageerror', err => jsErrors.push(err.message));

  // 1. Home page
  console.log('\n--- HOME PAGE ---');
  await page.goto(baseUrl + '/#/');
  await page.waitForTimeout(500);
  const title = await page.textContent('h1');
  assert(title && title.includes('Hobby'), 'Home page shows title with "Hobby"');
  const links = await page.$$('.nav-links a');
  assert(links.length === 4, 'Nav has 4 links');
  const ctaButtons = await page.$$('.cta-row .btn');
  assert(ctaButtons.length === 2, 'Home has 2 CTA buttons');

  // 2. Explore page
  console.log('\n--- EXPLORE PAGE ---');
  await page.goto(baseUrl + '/#/explore');
  await page.waitForTimeout(2000);
  const cards = await page.$$('.card');
  assert(cards.length > 0, `Explore shows hobby cards (got ${cards.length})`);
  const firstCardName = await page.textContent('.card h3');
  assert(firstCardName && firstCardName.length > 0, `First card has name: "${firstCardName}"`);
  // Check radar charts rendered
  const canvases = await page.$$('.radar-wrap canvas');
  assert(canvases.length > 0, `Radar charts rendered (${canvases.length} canvases)`);

  // 3. Search
  console.log('\n--- SEARCH ---');
  await page.fill('#search-input', 'japanese');
  await page.click('.search-bar button');
  await page.waitForTimeout(1500);
  const searchCards = await page.$$('.card');
  assert(searchCards.length > 0, `Search "japanese" returned ${searchCards.length} results`);
  const searchResult = await page.textContent('.card h3');
  console.log('  First search result:', searchResult);

  // 4. Filter
  console.log('\n--- FILTERS ---');
  await page.goto(baseUrl + '/#/');
  await page.waitForTimeout(500);
  await page.goto(baseUrl + '/#/explore');
  await page.waitForTimeout(2500);
  const beforeCount = (await page.$$('.card')).length;
  console.log('  Before filter:', beforeCount, 'cards');
  // Set physical demand filter to 0.3
  await page.evaluate(() => {
    const slider = document.getElementById('f-phys');
    if (slider) { slider.value = '0.3'; slider.dispatchEvent(new Event('input')); }
  });
  await page.click('button:has-text("Apply")');
  await page.waitForTimeout(1500);
  const afterCount = (await page.$$('.card')).length;
  assert(afterCount <= beforeCount, `Filter reduced results: ${beforeCount} -> ${afterCount}`);

  // 5. Detail modal
  console.log('\n--- DETAIL MODAL ---');
  await page.goto(baseUrl + '/#/explore');
  await page.waitForTimeout(1500);
  const detailBtn = await page.$('.card-actions button:first-child');
  if (detailBtn) {
    await detailBtn.click();
    await page.waitForTimeout(500);
    const modal = await page.$('.modal');
    assert(modal !== null, 'Detail modal opens');
    const modalTitle = await page.textContent('.modal h2');
    assert(modalTitle && modalTitle.length > 0, `Modal shows hobby name: "${modalTitle}"`);
    // Close modal
    await page.click('.close-btn');
    await page.waitForTimeout(300);
    const modalAfter = await page.$('.modal-overlay');
    assert(modalAfter === null, 'Modal closes');
  }

  // 6. Compare page (without selections)
  console.log('\n--- COMPARE PAGE ---');
  await page.goto(baseUrl + '/#/compare');
  await page.waitForTimeout(500);
  const compareEmpty = await page.textContent('.empty h2');
  assert(compareEmpty && compareEmpty.includes('Compare'), 'Compare page shows empty state');

  // 7. Match page
  console.log('\n--- MATCH PAGE ---');
  await page.goto(baseUrl + '/#/match');
  await page.waitForTimeout(500);
  const matchTitle = await page.textContent('h2');
  assert(matchTitle && matchTitle.includes('Memory'), 'Match page has title');
  const textarea = await page.$('textarea');
  assert(textarea !== null, 'Match page has textarea');

  // 8. Full match flow
  console.log('\n--- FULL MATCH FLOW ---');
  await page.fill('textarea', 'I love Japanese history and want something disciplined, meaningful, that I can do long-term');
  await page.click('#match-btn');
  await page.waitForTimeout(3000);
  const signals = await page.$$('.signal-tag');
  assert(signals.length > 0, `Extracted ${signals.length} signals`);
  const results = await page.$$('.result-card');
  assert(results.length > 0, `Got ${results.length} recommendations`);
  if (results.length > 0) {
    const topName = await page.textContent('.result-card h3');
    console.log('  Top match:', topName);
    const reasons = await page.$$('.result-card .reasons li');
    assert(reasons.length > 0, `Result has reasons (${reasons.length})`);
    const caution = await page.$('.result-card .caution');
    assert(caution !== null, 'Result has caution');
    const matchRadar = await page.$('.result-card .radar-wrap canvas');
    assert(matchRadar !== null, 'Result has radar chart');
  }

  // 9. JS Error check
  console.log('\n--- JS ERRORS ---');
  assert(jsErrors.length === 0, `No JavaScript errors (found ${jsErrors.length})`);
  if (jsErrors.length > 0) {
    jsErrors.forEach(e => console.error('  JS Error:', e));
  }

  // Summary
  console.log('\n==============================');
  if (failures === 0) {
    console.log('ALL TESTS PASSED');
  } else {
    console.log(`${failures} TEST(S) FAILED`);
  }
  console.log('==============================\n');

  await browser.close();
  process.exit(failures > 0 ? 1 : 0);
})();
