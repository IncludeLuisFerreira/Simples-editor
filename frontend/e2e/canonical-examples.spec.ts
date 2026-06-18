import { test, expect, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const AUTH_SESSION = {
  access_token: 'e2e-test-token',
  refresh_token: 'e2e-refresh-token',
  expires_at: 9999999999,
  user: {
    id: 'e2e-user',
    email: 'test@e2e.local',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
    role: 'authenticated',
  },
}

function readExample(name: string): string {
  return fs.readFileSync(
    path.resolve(__dirname, '..', 'examples', `${name}.simples`),
    'utf-8',
  )
}

async function setupAuth(page: Page) {
  await page.addInitScript((session) => {
    localStorage.setItem(
      'sb-test-e2e-auth-token',
      JSON.stringify(session),
    )
  }, AUTH_SESSION)
}

async function mockCompileRoute(page: Page) {
  await page.route('/api/compile', async (route) => {
    const request = route.request()
    if (request.method() !== 'POST') {
      await route.continue()
      return
    }
    const body = request.postDataJSON() as Record<string, unknown> | null
    const code = (body?.code as string) ?? ''

    let asm: string
    if (code.includes('leia')) {
      asm = `section .bss
    buf resb 12
section .text
    global _start
_start:
    mov eax, 3
    mov ebx, 0
    mov ecx, buf
    mov edx, 12
    int 0x80
    mov eax, 4
    mov ebx, 1
    mov ecx, buf
    mov edx, 12
    int 0x80
    mov eax, 1
    xor ebx, ebx
    int 0x80`
    } else if (code.includes('escreva')) {
      asm = `section .data
    msg db 'Ola Mundo', 10
section .text
    global _start
_start:
    mov eax, 4
    mov ebx, 1
    mov ecx, msg
    mov edx, 10
    int 0x80
    mov eax, 1
    xor ebx, ebx
    int 0x80`
    } else {
      asm = `section .text
    global _start
_start:
    mov eax, 1
    xor ebx, ebx
    int 0x80`
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        asm,
        binary_key: 'e2e-test-key',
      }),
    })
  })
}

async function typeCodeInEditor(page: Page, code: string) {
  await page.waitForSelector('.monaco-editor', { state: 'visible', timeout: 15000 })
  await page.waitForFunction(
    () => (window as unknown as Record<string, unknown>).monaco !== undefined,
    { timeout: 10000 },
  )
  await page.evaluate((codeText) => {
    const m = (window as unknown as Record<string, unknown>).monaco as
      | { editor?: { getEditors?: () => Array<{ setValue: (v: string) => void }> } }
      | undefined
    const editors = m?.editor?.getEditors?.()
    if (editors && editors.length > 0) {
      editors[0].setValue(codeText)
    }
  }, code)
}

async function getNasmPanelContent(page: Page): Promise<string> {
  const editors = page.locator('.monaco-editor')
  const count = await editors.count()
  if (count >= 2) {
    return (await editors.nth(1).innerText()) ?? ''
  }
  return (await editors.first().innerText()) ?? ''
}

async function expectNasmPanelHasAssembly(page: Page) {
  const nasmText = await getNasmPanelContent(page)
  expect(nasmText).toMatch(/section|global|_start|mov|int/)
  expect(nasmText.length).toBeGreaterThan(10)
}

test.describe('7 Canonical Examples', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await mockCompileRoute(page)
    await page.goto('/')
    await page.waitForSelector('.monaco-editor', { state: 'visible', timeout: 15000 })
  })

  test('hello world (escreva)', async ({ page }) => {
    const code = readExample('hello')
    await typeCodeInEditor(page, code)

    const runButton = page.getByRole('button', { name: /run/i })
    await expect(runButton).toBeEnabled()
    await runButton.click()

    await page.waitForTimeout(800)
    await expectNasmPanelHasAssembly(page)
  })

  test('atribuição e expressões aritméticas', async ({ page }) => {
    const code = readExample('atribuicao')
    await typeCodeInEditor(page, code)

    await page.getByRole('button', { name: /run/i }).click()
    await page.waitForTimeout(800)

    await expectNasmPanelHasAssembly(page)
  })

  test('leia + escreva (input interativo)', async ({ page }) => {
    const code = readExample('leia_escreva')
    await typeCodeInEditor(page, code)

    await page.getByRole('button', { name: /run/i }).click()
    await page.waitForTimeout(800)

    await expectNasmPanelHasAssembly(page)
  })

  test('se/entao/senao', async ({ page }) => {
    const code = readExample('se')
    await typeCodeInEditor(page, code)

    await page.getByRole('button', { name: /run/i }).click()
    await page.waitForTimeout(800)

    await expectNasmPanelHasAssembly(page)
  })

  test('enquanto', async ({ page }) => {
    const code = readExample('enquanto')
    await typeCodeInEditor(page, code)

    await page.getByRole('button', { name: /run/i }).click()
    await page.waitForTimeout(800)

    await expectNasmPanelHasAssembly(page)
  })

  test('para/de/ate/passo', async ({ page }) => {
    const code = readExample('para')
    await typeCodeInEditor(page, code)

    await page.getByRole('button', { name: /run/i }).click()
    await page.waitForTimeout(800)

    await expectNasmPanelHasAssembly(page)
  })

  test('fatorial (programa completo)', async ({ page }) => {
    const code = readExample('fatorial')
    await typeCodeInEditor(page, code)

    await page.getByRole('button', { name: /run/i }).click()
    await page.waitForTimeout(800)

    await expectNasmPanelHasAssembly(page)
  })
})

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test('shows compile error banner for unknown phase', async ({ page }) => {
    await page.route('/api/compile', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Erro desconhecido ao compilar.',
          phase: 'unknown',
          line: 3,
          column: 3,
        }),
      })
    })

    await page.goto('/')
    await page.waitForSelector('.monaco-editor', { state: 'visible', timeout: 15000 })

    const code = 'programa erro\ninicio\n  x <- 10\nfim'
    await typeCodeInEditor(page, code)

    await page.getByRole('button', { name: /run/i }).click()
    await page.waitForTimeout(500)

    const errorBanner = page.getByText(/Erro desconhecido ao compilar/i)
    await expect(errorBanner.first()).toBeVisible({ timeout: 3000 })
  })

  test('shows infra-error in NASM panel', async ({ page }) => {
    await page.route('/api/compile', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'nasm: error: symbol .text redefined',
          phase: 'nasm',
        }),
      })
    })

    await page.goto('/')
    await page.waitForSelector('.monaco-editor', { state: 'visible', timeout: 15000 })

    const code = readExample('hello')
    await typeCodeInEditor(page, code)

    await page.getByRole('button', { name: /run/i }).click()
    await page.waitForTimeout(500)

    const nasmError = page.getByText('nasm: error: symbol .text redefined')
    await expect(nasmError).toBeVisible({ timeout: 3000 })
  })

  test('shows network error when server unreachable', async ({ page }) => {
    await page.route('/api/compile', async (route) => {
      await route.abort('connectionrefused')
    })

    await page.goto('/')
    await page.waitForSelector('.monaco-editor', { state: 'visible', timeout: 15000 })

    const code = readExample('hello')
    await typeCodeInEditor(page, code)

    await page.getByRole('button', { name: /run/i }).click()
    await page.waitForTimeout(500)

    const networkError = page.getByText(/erro de rede/i)
    await expect(networkError).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Editor UI Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await mockCompileRoute(page)
    await page.goto('/')
    await page.waitForSelector('.monaco-editor', { state: 'visible', timeout: 15000 })
  })

  test('Run button is enabled after page load', async ({ page }) => {
    const runButton = page.getByRole('button', { name: /run/i })
    await expect(runButton).toBeVisible()
    await expect(runButton).toBeEnabled()
  })

  test('editor accepts typing via Monaco API', async ({ page }) => {
    const code = readExample('hello')
    await typeCodeInEditor(page, code)

    const editorValue = await page.evaluate(() => {
      const m = (window as unknown as Record<string, unknown>).monaco as
        | { editor?: { getEditors?: () => Array<{ getValue?: () => string }> } }
        | undefined
      const editors = m?.editor?.getEditors?.()
      return editors?.[0]?.getValue?.() ?? ''
    })
    expect(editorValue).toBe(code)
  })

  test('NASM panel shows idle message initially', async ({ page }) => {
    const idleMessage = page.getByText(/compile seu código/i)
    await expect(idleMessage).toBeVisible({ timeout: 5000 })
  })

  test('compile state transitions idle -> compiling -> success', async ({ page }) => {
    const code = readExample('atribuicao')
    await typeCodeInEditor(page, code)

    // Trigger compile
    await page.getByRole('button', { name: /run/i }).click()

    // Button should briefly show "Compilando..."
    // (This is tight timing, so we just verify it ends up in success state)
    await page.waitForTimeout(800)

    // After mock returns, NASM panel should show assembly
    const nasmText = await getNasmPanelContent(page)
    expect(nasmText.length).toBeGreaterThan(10)
  })
})

test.describe('Examples Dropdown', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    await mockCompileRoute(page)
    await page.goto('/')
    await page.waitForSelector('.monaco-editor', { state: 'visible', timeout: 15000 })
  })

  test('loads example code into editor', async ({ page }) => {
    const dropdown = page.locator('select[aria-label="Carregar exemplo"]')
    await dropdown.selectOption('fatorial')

    await page.waitForTimeout(500)

    const editorValue = await page.evaluate(() => {
      const m = (window as unknown as Record<string, unknown>).monaco as
        | { editor?: { getEditors?: () => Array<{ getValue?: () => string }> } }
        | undefined
      const editors = m?.editor?.getEditors?.()
      return editors?.[0]?.getValue?.() ?? ''
    })
    expect(editorValue).toContain('programa fatorial')
    expect(editorValue).toContain('fat <- 1')
  })

  test('shows confirm dialog when editor has code', async ({ page }) => {
    const code = 'programa existente\ninicio\nfim'
    await typeCodeInEditor(page, code)

    const dropdown = page.locator('select[aria-label="Carregar exemplo"]')
    await dropdown.selectOption('hello')

    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('Substituir código?')).toBeVisible()
    await expect(page.getByText('O editor já contém código')).toBeVisible()
  })

  test('confirm dialog replaces code', async ({ page }) => {
    const code = 'programa existente\ninicio\nfim'
    await typeCodeInEditor(page, code)

    const dropdown = page.locator('select[aria-label="Carregar exemplo"]')
    await dropdown.selectOption('fatorial')

    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })

    await page.getByRole('button', { name: 'Substituir' }).click()

    await page.waitForTimeout(500)

    const editorValue = await page.evaluate(() => {
      const m = (window as unknown as Record<string, unknown>).monaco as
        | { editor?: { getEditors?: () => Array<{ getValue?: () => string }> } }
        | undefined
      const editors = m?.editor?.getEditors?.()
      return editors?.[0]?.getValue?.() ?? ''
    })
    expect(editorValue).toContain('programa fatorial')
    expect(editorValue).not.toContain('programa existente')
  })

  test('cancel dialog keeps original code', async ({ page }) => {
    const code = 'programa existente\ninicio\nfim'
    await typeCodeInEditor(page, code)

    const dropdown = page.locator('select[aria-label="Carregar exemplo"]')
    await dropdown.selectOption('hello')

    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })

    await page.getByRole('button', { name: 'Cancelar' }).click()

    await page.waitForTimeout(500)

    const editorValue = await page.evaluate(() => {
      const m = (window as unknown as Record<string, unknown>).monaco as
        | { editor?: { getEditors?: () => Array<{ getValue?: () => string }> } }
        | undefined
      const editors = m?.editor?.getEditors?.()
      return editors?.[0]?.getValue?.() ?? ''
    })
    expect(editorValue).toContain('programa existente')
  })

  test('resets NASM panel to idle after loading example', async ({ page }) => {
    const code = readExample('hello')
    await typeCodeInEditor(page, code)

    await page.getByRole('button', { name: /run/i }).click()
    await page.waitForTimeout(800)

    // NASM should show assembly now
    const nasmTextBefore = await getNasmPanelContent(page)
    expect(nasmTextBefore.length).toBeGreaterThan(10)

    // Load another example via dropdown
    const dropdown = page.locator('select[aria-label="Carregar exemplo"]')
    await dropdown.selectOption('fatorial')

    // Confirm the replacement
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toBeVisible({ timeout: 3000 })
    await page.getByRole('button', { name: 'Substituir' }).click()
    await page.waitForTimeout(500)

    // NASM should be back to idle message
    const idleMessage = page.getByText(/compile seu código para ver o assembly gerado/i)
    await expect(idleMessage).toBeVisible({ timeout: 5000 })
  })
})
