import { parseImportText } from './importSource'
import { buildShareLink, encodePacket, type SharePacket } from './share'

const packet: SharePacket = {
  app: 'jbirthdays',
  version: 1,
  people: [{ id: 'a', name: 'Lena', month: 10, day: 24, tags: [] }],
}

describe('parseImportText', () => {
  it('accepts a full link, a bare payload and raw JSON', async () => {
    const link = await buildShareLink(packet, 'https://x.test/')
    expect(await parseImportText(link)).toEqual({ kind: 'packet', packet })
    expect(await parseImportText(await encodePacket(packet))).toEqual({ kind: 'packet', packet })
    expect(await parseImportText(JSON.stringify(packet))).toEqual({ kind: 'packet', packet })
  })

  it('recognises backups', async () => {
    const r = await parseImportText(JSON.stringify({ app: 'jbirthdays-backup', schemaVersion: 1, data: {} }))
    expect(r?.kind).toBe('backup')
  })

  it('rejects junk', async () => {
    expect(await parseImportText('')).toBeNull()
    expect(await parseImportText('hello world')).toBeNull()
    expect(await parseImportText('{not json')).toBeNull()
  })
})
