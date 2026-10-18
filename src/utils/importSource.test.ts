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

  it('finds a share link inside a pasted chat message with commas', async () => {
    const link = await buildShareLink(packet, 'https://x.test/')
    expect(await parseImportText(`Hey Lena, here are the birthdays: ${link}`)).toEqual({ kind: 'packet', packet })
  })

  it('recognises backups', async () => {
    const r = await parseImportText(JSON.stringify({ app: 'jbirthdays-backup', schemaVersion: 1, data: {} }))
    expect(r?.kind).toBe('backup')
  })

  it("reads other apps' exports as packets with their origin and skipped rows", async () => {
    const vcf = [
      'BEGIN:VCARD',
      'FN:Lena',
      'BDAY:1998-10-24',
      'END:VCARD',
      'BEGIN:VCARD',
      'FN:Bad',
      'BDAY:x',
      'END:VCARD',
    ].join('\r\n')
    const r = await parseImportText(vcf)
    expect(r?.kind).toBe('packet')
    if (r?.kind !== 'packet') return
    expect(r.origin).toBe('contacts')
    expect(r.packet.people.map((p) => p.name)).toEqual(['Lena'])
    expect(r.skipped).toEqual([{ label: 'Bad', reason: 'Unreadable date' }])
  })

  it('rejects junk', async () => {
    expect(await parseImportText('')).toBeNull()
    expect(await parseImportText('hello world')).toBeNull()
    expect(await parseImportText('{not json')).toBeNull()
  })
})
