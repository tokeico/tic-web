import { usd } from './format'
import type { Offramp, Outcome, Payout, Rule, Source } from './types'

/**
 * Rules pack v1 and the demo registry. Fictional providers, demo FX rates,
 * sourced-but-unreviewed rules — the UI labels all three as such.
 *
 * This is the fixture layer: the shapes here are what the API is expected to
 * return, so swapping in `GET /api/rules` and `GET /api/payouts` later means
 * replacing these constants, not the engine.
 */

export const SOURCES: Record<string, Source> = {
  fcm: {
    name: 'BCB Res. 520–522 summary · FCM Law',
    short: 'BCB VASP rules',
    url: 'https://fcm.law/brazil-vasp-license/',
  },
  eco: {
    name: 'BCB Res. 561 summary · Eco',
    short: 'BCB Res. 561',
    url: 'https://eco.com/support/en/articles/15575501-brazil-stablecoin-regulation-2026-what-drex-s-pivot-means-for-usdc-and-usdt-inflows',
  },
  mx: {
    name: 'Banxico Circular 4/2019 · iProUP',
    short: 'Banxico 4/2019',
    url: 'https://www.iproup.com/economia-digital/67728-bitcoin-bancos-mexicanos-sigue-prohibido-acceder-legalmente-mayo-2026',
  },
  ar: {
    name: 'LatAm regulation overview · Stablecoin Insider',
    short: 'CNV / LatAm overview',
    url: 'https://stablecoininsider.org/stablecoin-regulation-in-latin-america/',
  },
  ve: {
    name: 'OFAC Venezuela-related sanctions',
    short: 'OFAC Venezuela',
    url: 'https://ofac.treasury.gov/sanctions-programs-and-country-information/venezuela-related-sanctions',
  },
}

const NA: [Outcome, string] = ['na', 'Applies to stablecoin routes only.']

export const RULES: Rule[] = [
  {
    id: 'BR-521-FX',
    c: 'BR',
    from: '2026-02-02',
    to: null,
    kind: 'fields',
    title: 'Stablecoin payments are FX operations',
    src: SOURCES.fcm,
    ev: (p, r) =>
      r.kind === 'wire'
        ? NA
        : p.inv.purposeCode
          ? ['pass', 'Purpose code and payer/payee data are present.']
          : ['fields', 'The FX purpose code is missing.'],
  },
  {
    id: 'BR-521-CAP',
    c: 'BR',
    from: '2026-02-02',
    to: null,
    kind: 'block',
    title: 'USD 100k per-operation cap for standard VASPs',
    src: SOURCES.fcm,
    ev: (p, r) =>
      r.kind === 'wire'
        ? NA
        : p.usd > 100000
          ? ['block', usd(p.usd) + ' is over the per-operation cap.']
          : ['pass', usd(p.usd) + ' is under the cap.'],
  },
  {
    id: 'BR-561-EFX',
    c: 'BR',
    from: '2026-10-01',
    to: null,
    kind: 'block',
    title: 'eFX providers may not settle overseas payments in stablecoins',
    src: SOURCES.eco,
    ev: (_p, r) =>
      r.kind === 'wire'
        ? NA
        : r.off!.type === 'efx'
          ? ['block', r.off!.name + ' is an eFX provider.']
          : ['pass', r.off!.name + ' is not an eFX provider.'],
  },
  {
    id: 'BR-VASP-PENDING-WARN',
    c: 'BR',
    from: '2026-02-02',
    to: '2026-10-29',
    kind: 'warn',
    title: 'Off-ramp authorization still pending',
    src: SOURCES.fcm,
    ev: (_p, r) =>
      r.kind === 'wire'
        ? NA
        : r.off!.type === 'vasp_pending'
          ? [
              'warn',
              r.off!.name +
                '’s VASP authorization is still pending; the transition ends Oct 29.',
            ]
          : ['pass', r.off!.name + ' is not awaiting authorization.'],
  },
  {
    id: 'BR-VASP-AUTH',
    c: 'BR',
    from: '2026-10-30',
    to: null,
    kind: 'block',
    title: 'VASP authorization transition ends',
    src: SOURCES.fcm,
    ev: (_p, r) =>
      r.kind === 'wire'
        ? NA
        : r.off!.type === 'vasp_authorized'
          ? ['pass', r.off!.name + ' is an authorized VASP.']
          : ['block', r.off!.name + ' is not an authorized VASP.'],
  },
  {
    id: 'MX-BANK-CRYPTO',
    c: 'MX',
    from: '2019-03-08',
    verify: true,
    to: null,
    kind: 'block',
    title: 'Banks may not operate with crypto',
    src: SOURCES.mx,
    ev: (_p, r) =>
      r.kind === 'wire'
        ? NA
        : r.off!.type === 'bank'
          ? ['block', r.off!.name + ' is a bank; a licensed non-bank is required.']
          : ['pass', r.off!.name + ' is a licensed non-bank.'],
  },
  {
    id: 'AR-PSAV',
    c: 'AR',
    from: null,
    verify: true,
    to: null,
    kind: 'block',
    title: 'Ramps must be registered PSAVs',
    src: SOURCES.ar,
    ev: (_p, r) =>
      r.kind === 'wire'
        ? NA
        : r.off!.type === 'p2p_unregistered'
          ? ['block', r.off!.name + ' is not a registered PSAV.']
          : ['pass', r.off!.name + ' is a registered PSAV.'],
  },
  {
    id: 'AR-FX-SPREAD',
    c: 'AR',
    from: null,
    to: null,
    kind: 'warn',
    title: 'Official vs. parallel exchange-rate gap',
    src: SOURCES.ar,
    ev: () => ['warn', 'Official ARS 1,350 vs. parallel ARS 1,460: an 8.1% gap.'],
  },
  {
    id: 'VE-OFAC',
    c: 'VE',
    from: null,
    to: null,
    kind: 'block',
    title: 'Venezuela sanctions program',
    src: SOURCES.ve,
    ev: (p) =>
      p.license
        ? [
            'pass',
            'General license ' +
              p.license.number +
              ' recorded; signed off by ' +
              p.license.by +
              '.',
          ]
        : [
            'block',
            'No named OFAC general license is recorded; a person must sign off.',
          ],
  },
]

export const OFFRAMPS: Offramp[] = [
  { id: 'br-pagafx', name: 'PagaFX', c: 'BR', type: 'efx', fee: 0.55, asset: 'USDC', net: 'Base', rail: 'Pix', min: 15 },
  { id: 'br-sol', name: 'Sol VASP', c: 'BR', type: 'vasp_authorized', fee: 0.85, asset: 'USDC', net: 'Base', rail: 'Pix', min: 12 },
  { id: 'br-ponte', name: 'Ponte Digital', c: 'BR', type: 'vasp_pending', fee: 0.7, asset: 'USDC', net: 'Base', rail: 'Pix', min: 20 },
  { id: 'mx-puente', name: 'Puente MX', c: 'MX', type: 'nonbank_licensed', fee: 0.6, asset: 'USDC', net: 'Base', rail: 'SPEI', min: 25 },
  { id: 'mx-bancoazul', name: 'Banco Azul', c: 'MX', type: 'bank', fee: 0.4, asset: 'USDC', net: 'Base', rail: 'SPEI', min: 20 },
  { id: 'ar-pampa', name: 'Pampa PSAV', c: 'AR', type: 'psav_registered', fee: 1.1, asset: 'USDT', net: 'Tron', rail: 'CVU', min: 30 },
  { id: 'ar-cueva', name: 'Cueva P2P', c: 'AR', type: 'p2p_unregistered', fee: 0.5, asset: 'USDT', net: 'Tron', rail: 'CVU', min: 15 },
]

const RAW_PAYOUTS: Omit<Payout, 'usd'>[] = [
  {
    id: 'br',
    payee: 'Estúdio Paulista Design Ltda',
    city: 'São Paulo',
    c: 'BR',
    country: 'Brazil',
    amount: 85000,
    cur: 'BRL',
    locale: 'pt-BR',
    rate: 5.4,
    settle: 5.41,
    file: 'estudio-paulista-INV-2026-0412.pdf',
    low: [],
    inv: {
      number: 'INV-2026-0412',
      taxId: 'CNPJ 12.345.678/0001-90',
      due: '2026-10-24',
      bank: 'Pix key · 12.345.678/0001-90',
      purposeCode: 'Design services (demo code)',
      desc: 'Brand identity and packaging design, Q3',
    },
  },
  {
    id: 'mx',
    payee: 'Autopartes del Norte S.A. de C.V.',
    city: 'Monterrey',
    c: 'MX',
    country: 'Mexico',
    amount: 1200000,
    cur: 'MXN',
    locale: 'es-MX',
    rate: 18.5,
    settle: 18.46,
    file: 'autopartes-norte-A-7781.pdf',
    low: ['bank'],
    inv: {
      number: 'A-7781',
      taxId: 'RFC ADN850301AB1',
      due: '2026-10-31',
      bank: 'CLABE · 002180700123456789',
      purposeCode: null,
      desc: 'Brake assemblies, PO 4471',
    },
  },
  {
    id: 'ar',
    payee: 'Lucía Fernández',
    city: 'Buenos Aires',
    c: 'AR',
    country: 'Argentina',
    amount: 4000,
    cur: 'USD',
    locale: 'en-US',
    rate: 1,
    settle: 1,
    file: 'lucia-fernandez-LF-0091.pdf',
    low: [],
    inv: {
      number: 'LF-0091',
      taxId: 'CUIT 27-31234567-4',
      due: '2026-10-20',
      bank: 'CVU · 0000003100012345678901',
      purposeCode: null,
      desc: 'Contract frontend work, September',
    },
  },
  {
    id: 've',
    payee: 'Transportes Orinoco C.A.',
    city: 'Caracas',
    c: 'VE',
    country: 'Venezuela',
    amount: 12500,
    cur: 'USD',
    locale: 'en-US',
    rate: 1,
    settle: 1,
    file: 'transportes-orinoco-TO-2231.pdf',
    low: [],
    inv: {
      number: 'TO-2231',
      taxId: 'RIF J-31234567-8',
      due: '2026-10-28',
      bank: 'Account · 0102 0123 4501 2345 6789',
      purposeCode: null,
      desc: 'Freight services, Puerto Cabello',
    },
  },
  {
    // Appears only once "Simulate a suspicious invoice" is used.
    id: 'br2',
    hidden: true,
    payee: 'Estúdio Paulista Design Ltda',
    city: 'São Paulo',
    c: 'BR',
    country: 'Brazil',
    amount: 84700,
    cur: 'BRL',
    locale: 'pt-BR',
    rate: 5.4,
    settle: 5.41,
    file: 'estudio-paulista-INV-2026-0419.pdf',
    low: ['bank'],
    inv: {
      number: 'INV-2026-0419',
      taxId: 'CNPJ 12.345.678/0001-90',
      due: '2026-10-19',
      bank: 'Pix key · 98.765.432/0001-10',
      purposeCode: 'Design services (demo code)',
      desc: 'Brand identity and packaging design, Q3 (resubmitted)',
    },
    security: {
      quote: 'pre-approved, pay today to the new Pix key',
      onFile: '…0001-90',
      onInvoice: '…0001-10',
      dupOf: 'INV-2026-0412',
    },
  },
]

export const PAYOUTS: Payout[] = RAW_PAYOUTS.map((p) => ({
  ...p,
  usd: Math.round((p.amount / p.rate) * 100) / 100,
}))

export const payoutById = (id: string): Payout => {
  const p = PAYOUTS.find((x) => x.id === id)
  if (!p) throw new Error('unknown payout ' + id)
  return p
}

/** The hidden fraud invoice joins the list only after it has been simulated. */
export const visiblePayouts = (sus: boolean) =>
  PAYOUTS.filter((p) => !p.hidden || sus)

export const cite = (id: string) => {
  const r = RULES.find((x) => x.id === id)
  return { id, url: r ? r.src.url : '#', tip: r ? r.title + ' · ' + r.src.name : id }
}

export const OFFRAMP_TYPE_LABEL: Record<string, string> = {
  vasp_authorized: 'authorized VASP',
  vasp_pending: 'VASP · authorization pending',
  efx: 'eFX provider',
  bank: 'bank',
  nonbank_licensed: 'licensed non-bank',
  psav_registered: 'registered PSAV',
  p2p_unregistered: 'unregistered P2P desk',
}

export const OFFRAMP_TYPE_TITLE: Record<string, string> = {
  vasp_authorized: 'Authorized VASP',
  vasp_pending: 'VASP, authorization pending',
  efx: 'eFX provider',
  bank: 'Bank',
  nonbank_licensed: 'Licensed non-bank',
  psav_registered: 'Registered PSAV',
  p2p_unregistered: 'Unregistered P2P desk',
}

/** The SWIFT baseline every saving in the UI is measured against. */
export const WIRE_FEE_PCT = 4.5
