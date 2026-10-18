import { describe, expect, it } from 'vitest'
import { isAllowedApkUrl, parseSha256Digest } from './app-update'

const HEX = 'a'.repeat(64)

describe('isAllowedApkUrl', () => {
  it('accepts release APK assets of this repo', () => {
    expect(
      isAllowedApkUrl('https://github.com/RLT-Newside/JBirthdays/releases/download/v1.8.0/JBirthdays-v1.8.0.apk'),
    ).toBe(true)
  })

  it.each([
    'http://github.com/RLT-Newside/JBirthdays/releases/download/v1.8.0/JBirthdays.apk',
    'https://github.com/someone/JBirthdays/releases/download/v1.8.0/JBirthdays.apk',
    'https://github.com/RLT-Newside/JBirthdays/releases/latest',
    'https://github.com/RLT-Newside/JBirthdays/releases/download/v1.8.0/JBirthdays.zip',
    'https://github.com.evil.io/RLT-Newside/JBirthdays/releases/download/v1.8.0/JBirthdays.apk',
    'https://github.com/RLT-Newside/JBirthdays/releases/download/v1.8.0/../x/JBirthdays.apk',
    'https://github.com/RLT-Newside/JBirthdays/releases/download/v1.8.0/JBirthdays.apk?x=1',
  ])('rejects %s', (url) => {
    expect(isAllowedApkUrl(url)).toBe(false)
  })
})

describe('parseSha256Digest', () => {
  it('extracts lowercase hex from a GitHub asset digest', () => {
    expect(parseSha256Digest(`sha256:${'AB'.repeat(32)}`)).toBe('ab'.repeat(32))
    expect(parseSha256Digest(`sha256:${HEX}`)).toBe(HEX)
  })

  it.each([undefined, null, 42, '', HEX, `sha1:${HEX}`, `sha256:${HEX.slice(1)}`, `sha256:${'z'.repeat(64)}`])(
    'returns null for %s',
    (digest) => {
      expect(parseSha256Digest(digest)).toBeNull()
    },
  )
})
