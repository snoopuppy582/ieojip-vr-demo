const { chromium } = require('@playwright/test')

async function main() {
  const browser = await chromium.launch({ headless: true })

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 })
  await desktop.goto('http://localhost:5173', { waitUntil: 'networkidle' })
  await desktop.getByRole('button', { name: /매물 상세 보기/ }).click()
  await desktop.getByRole('button', { name: /VR 상담 시작/ }).click()
  await desktop.waitForSelector('canvas', { timeout: 10000 })
  await desktop.waitForTimeout(1200)
  await desktop.screenshot({ path: 'test-results/viewer-desktop.png', fullPage: true })

  const canvasSample = await desktop.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return { ok: false, reason: 'canvas-missing' }

    const temp = document.createElement('canvas')
    temp.width = canvas.width
    temp.height = canvas.height
    const context = temp.getContext('2d')
    if (!context) return { ok: false, reason: '2d-context-missing' }

    context.drawImage(canvas, 0, 0)
    const image = context.getImageData(0, 0, temp.width, temp.height).data
    let bright = 0
    let colored = 0
    const step = 16

    for (let i = 0; i < image.length; i += 4 * step) {
      const r = image[i]
      const g = image[i + 1]
      const b = image[i + 2]
      if (r + g + b > 80) bright += 1
      if (Math.max(r, g, b) - Math.min(r, g, b) > 20) colored += 1
    }

    return {
      ok: bright > 500 && colored > 300,
      width: canvas.width,
      height: canvas.height,
      bright,
      colored,
    }
  })

  if (!canvasSample.ok) {
    throw new Error(`Viewer canvas check failed: ${JSON.stringify(canvasSample)}`)
  }

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  await mobile.goto('http://localhost:5173', { waitUntil: 'networkidle' })
  await mobile.getByRole('button', { name: /매물 상세 보기/ }).click()
  await mobile.getByRole('button', { name: /VR 상담 시작/ }).click()
  await mobile.getByRole('button', { name: /다음 시점/ }).click()
  await mobile.getByRole('button', { name: /방문 후보로 선택/ }).click()
  await mobile.waitForSelector('#result-title', { timeout: 10000 })
  await mobile.screenshot({ path: 'test-results/result-mobile.png', fullPage: true })

  const mobileState = await mobile.evaluate(() => ({
    title: document.querySelector('#result-title')?.textContent ?? '',
    hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  }))

  if (mobileState.title !== '실제 방문 후보로 선택되었습니다.' || mobileState.hasHorizontalOverflow) {
    throw new Error(`Mobile flow check failed: ${JSON.stringify(mobileState)}`)
  }

  const shortcut = await browser.newPage({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1 })
  await shortcut.goto('http://localhost:5173?step=viewer', { waitUntil: 'networkidle' })
  await shortcut.waitForSelector('canvas', { timeout: 10000 })
  await shortcut.keyboard.press('w')
  await shortcut.keyboard.press('Enter')
  await shortcut.waitForSelector('#result-title', { timeout: 10000 })

  const shortcutState = await shortcut.evaluate(() => ({
    title: document.querySelector('#result-title')?.textContent ?? '',
  }))

  if (shortcutState.title !== '실제 방문 후보로 선택되었습니다.') {
    throw new Error(`Shortcut flow check failed: ${JSON.stringify(shortcutState)}`)
  }

  await browser.close()
  console.log(JSON.stringify({ desktop: canvasSample, mobile: mobileState, shortcut: shortcutState }, null, 2))
}

main().catch(async (error) => {
  console.error(error)
  process.exit(1)
})
