import { type ContactPhone, whatsappCandidates, whatsappLink } from './whatsapp'

describe('whatsappLink', () => {
  it('builds a wa.me link with the encoded message', () => {
    expect(whatsappLink('+41791234567', 'Happy birthday, Lena! 🎉')).toBe(
      'https://wa.me/41791234567?text=Happy%20birthday%2C%20Lena!%20%F0%9F%8E%89',
    )
  })
})

describe('whatsappCandidates', () => {
  it('keeps international numbers only, mobiles first, without duplicates', () => {
    const phones: ContactPhone[] = [
      { number: '044 123 45 67', normalized: '+41441234567', type: 'work' },
      { number: '079 123', type: 'mobile' },
      { number: '+41 79 123 45 67', normalized: '+41791234567', type: 'mobile' },
      { number: '0791234567', normalized: '+41791234567', type: 'other' },
    ]
    expect(whatsappCandidates(phones).map((p) => p.normalized)).toEqual(['+41791234567', '+41441234567'])
  })

  it('returns nothing when no number has a country code', () => {
    expect(whatsappCandidates([{ number: '079 123', type: 'mobile' }])).toEqual([])
  })
})
