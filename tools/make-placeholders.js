// Writes the flat placeholder sprites in res/placeholder/.
// Every file here is a stand-in: a coloured block with a cross and a short tag.
// Replace any of them with real pixel art of the same size and the game picks it up.
// Run with: node tools/make-placeholders.js
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const OUT_DIR = path.join(__dirname, '..', 'res', 'placeholder')

const FONT = {
	A: '010101111101101',
	B: '110101110101110',
	C: '011100100100011',
	D: '110101101101110',
	E: '111100110100111',
	F: '111100110100100',
	G: '011100101101011',
	H: '101101111101101',
	I: '111010010010111',
	K: '101101110101101',
	L: '100100100100111',
	N: '110101101101101',
	O: '010101101101010',
	P: '110101110100100',
	R: '110101110101101',
	S: '011100010001110',
	T: '111010010010010',
	U: '101101101101111',
	X: '101101010101101',
	Y: '101101010010010',
	'1': '010110010010111',
}

const COLORS = {
	joker: [0x8e, 0x44, 0xad],
	upgrade: [0x1f, 0x8a, 0x70],
	part: [0xc8, 0x7f, 0x0a],
	service: [0x2e, 0x6f, 0xc4],
	enemy: [0xb0, 0x30, 0x30],
}

const SPRITES = [
	{ file: 'joker-code-golf', size: 32, tag: 'GLF', color: 'joker' },
	{ file: 'joker-pure-function', size: 32, tag: 'PUR', color: 'joker' },
	{ file: 'joker-rubber-duck', size: 32, tag: 'DUK', color: 'joker' },
	{ file: 'joker-off-by-one', size: 32, tag: 'OB1', color: 'joker' },
	{ file: 'joker-technical-debt', size: 32, tag: 'DBT', color: 'joker' },
	{ file: 'joker-race-condition', size: 32, tag: 'RCE', color: 'joker' },
	{ file: 'joker-garbage-collector', size: 32, tag: 'GC', color: 'joker' },
	{ file: 'joker-hot-path', size: 32, tag: 'HOT', color: 'joker' },
	{ file: 'upgrade-sensors', size: 32, tag: 'SNS', color: 'upgrade' },
	{ file: 'upgrade-cannon', size: 32, tag: 'CAN', color: 'upgrade' },
	{ file: 'upgrade-thrusters', size: 32, tag: 'THR', color: 'upgrade' },
	{ file: 'upgrade-gyros', size: 32, tag: 'GYR', color: 'upgrade' },
	{ file: 'upgrade-clock', size: 32, tag: 'CLK', color: 'upgrade' },
	{ file: 'part-radar', size: 32, tag: 'RDR', color: 'part' },
	{ file: 'part-shield', size: 32, tag: 'SHD', color: 'part' },
	{ file: 'service-repair', size: 32, tag: 'FIX', color: 'service' },
	{ file: 'boss', size: 64, tag: 'BOSS', color: 'enemy' },
	{ file: 'shield', size: 48, tag: '', color: 'service', ring: true },
]

function crc32(buf) {
	let crc = ~0
	for (let i = 0; i < buf.length; i++) {
		crc ^= buf[i]
		for (let k = 0; k < 8; k++) {
			crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
		}
	}
	return ~crc >>> 0
}

function chunk(type, data) {
	const head = Buffer.alloc(4)
	head.writeUInt32BE(data.length)
	const body = Buffer.concat([Buffer.from(type), data])
	const tail = Buffer.alloc(4)
	tail.writeUInt32BE(crc32(body))
	return Buffer.concat([head, body, tail])
}

function encodePng(size, pixels) {
	const header = Buffer.alloc(13)
	header.writeUInt32BE(size, 0)
	header.writeUInt32BE(size, 4)
	header[8] = 8 // bit depth
	header[9] = 6 // RGBA
	const rows = Buffer.alloc(size * (size * 4 + 1))
	for (let y = 0; y < size; y++) {
		pixels.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
	}
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk('IHDR', header),
		chunk('IDAT', zlib.deflateSync(rows)),
		chunk('IEND', Buffer.alloc(0)),
	])
}

function draw({ size, tag, color, ring }) {
	const pixels = Buffer.alloc(size * size * 4)
	const base = COLORS[color]
	const dark = base.map((c) => Math.round(c * 0.55))
	const set = (x, y, rgb, alpha = 255) => {
		if (x < 0 || y < 0 || x >= size || y >= size) {
			return
		}
		pixels.set([rgb[0], rgb[1], rgb[2], alpha], (y * size + x) * 4)
	}

	if (ring) {
		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				const edge = Math.min(x, y, size - 1 - x, size - 1 - y)
				if (edge < 2) {
					set(x, y, [0x7f, 0xd4, 0xff], 200)
				}
			}
		}
		return pixels
	}

	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const border = x === 0 || y === 0 || x === size - 1 || y === size - 1
			const cross = x === y || x === size - 1 - y
			set(x, y, border || cross ? dark : base)
		}
	}

	const scale = 2
	const glyphWidth = 3 * scale
	const gap = scale
	const textWidth = tag.length * glyphWidth + (tag.length - 1) * gap
	const textHeight = 5 * scale
	const left = Math.floor((size - textWidth) / 2)
	const top = Math.floor((size - textHeight) / 2)
	for (let y = top - 2; y < top + textHeight + 2; y++) {
		for (let x = left - 2; x < left + textWidth + 2; x++) {
			set(x, y, dark)
		}
	}
	tag.split('').forEach((letter, index) => {
		const bits = FONT[letter]
		for (let i = 0; i < 15; i++) {
			if (bits[i] !== '1') {
				continue
			}
			const gx = left + index * (glyphWidth + gap) + (i % 3) * scale
			const gy = top + Math.floor(i / 3) * scale
			for (let dy = 0; dy < scale; dy++) {
				for (let dx = 0; dx < scale; dx++) {
					set(gx + dx, gy + dy, [255, 255, 255])
				}
			}
		}
	})
	return pixels
}

fs.mkdirSync(OUT_DIR, { recursive: true })
for (const sprite of SPRITES) {
	fs.writeFileSync(path.join(OUT_DIR, `${sprite.file}.png`), encodePng(sprite.size, draw(sprite)))
}
console.log(`Wrote ${SPRITES.length} placeholder sprites to ${OUT_DIR}`)
