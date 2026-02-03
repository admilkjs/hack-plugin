import chalk from 'chalk';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import protobuf from 'protobufjs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { v4 as uuidv4 } from 'uuid';

const require = createRequire(import.meta.url);
const logger = global.logger || console;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!segment.raw) segment.raw = (data) => ({ type: 'raw', data });

function log(data) {
	if (Array.isArray(data)) return data.map(i => log(i));
	if (typeof data === 'object' && data !== null) {
		Object.keys(data).forEach(i => { data[i] = log(data[i]); });
		return data;
	}
	const colors = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan'];
	return String(data).split('').map(c => chalk[colors[Math.floor(Math.random() * colors.length)]](c)).join('');
}

function loadNativeModule() {
	const isWin = process.platform === 'win32';
	const isArm = process.arch === 'arm64';
	
	let variants;
	if (isWin) {
		variants = ['windows-x64'];
	} else if (isArm) {
		variants = ['linux-arm64'];
	} else {
		variants = ['linux-x64', 'linux-x64-legacy'];
	}
	
	const paths = [path.join(__dirname, '../build/Release/hack.node')];
	variants.forEach(v => paths.push(path.join(__dirname, 'build', v, 'hack.node')));
	
	for (const p of paths) {
		try {
			if (fs.existsSync(p)) return require(p);
		} catch {}
	}
	return null;
}

const nativeModule = loadNativeModule();
if (!nativeModule) {
	logger.warn(log(`[hack-plugin] Native module not found! Platform: ${process.platform}/${process.arch}`));
}

const isTRSS = !!Bot.serverHandle;

async function initICQQ() {
	if (!nativeModule) return;
	let icqq;
	
	if (isTRSS) {
		try {
			if (!fs.statSync(path.join(process.cwd(), 'plugins', 'ICQQ-Plugin')).isDirectory()) return;
		} catch { return; }
		
		for (const i of ['Model', 'node_modules']) {
			try {
				const dir = `${process.cwd()}/plugins/ICQQ-Plugin/${i}/icqq/`;
				if (!fs.statSync(dir)) continue;
				icqq = (await import(`file://${dir}lib/index.js`)).default;
				break;
			} catch { icqq = null; }
		}
	} else {
		try { icqq = await import('icqq'); } catch { return; }
	}
	
	if (icqq) {
		try {
			if (nativeModule.init(global.Bot, icqq)) {
				logger.info(log('[hack-plugin] ICQQ Raw loaded'));
			}
		} catch (e) { logger.error(`[hack-plugin] Init failed: ${e.message}`); }
	}
}

await initICQQ();

export class fakeFile extends plugin {
	constructor() {
		super({
			name: 'fakeFile',
			dsc: 'fakeFile',
			event: 'message',
			priority: -5000,
			rule: [{ reg: /^#文件/i, fnc: 'send', permission: 'master' }]
		});
	}

	async send(e) {
		const encoder = new ProtobufEncoder();
		await encoder.load();
		const match = e.msg.match(/^#文件\s*(.+)\s+(\d+)?/);
		if (!match) return e.reply('格式: #文件 文件名 文件大小');
		
		const result = await encoder.encode({
			f1: 6, f7: '{"info": "hack"}', f4: match[1], f3: match[2], subproto2F1: 103
		});
		if (e.bot.adapter?.name == 'QQBot') await e.reply(JSON.stringify(result, null, 2));
		await e.reply(segment.raw(result));
	}
}

class ProtobufEncoder {
	constructor() { this.Root = null; this.Subproto2 = null; this.Subproto7 = null; }

	async load() {
		const proto = `
syntax = "proto2";
message root { optional subproto7 f7 = 7; optional uint32 f1 = 1; }
message subproto7 { optional subproto2 f2 = 2; }
message subproto2 { optional string f7 = 7; optional string f8 = 8; optional string f4 = 4; optional uint64 f3 = 3; optional uint32 f1 = 1; optional string f2 = 2; }
`;
		const root = protobuf.parse(proto).root;
		this.Root = root.lookupType('root');
		this.Subproto2 = root.lookupType('subproto2');
		this.Subproto7 = root.lookupType('subproto7');
	}

	async encode(params) {
		const rootMsg = this.Root.create();
		rootMsg.f1 = params.f1 || 6;
		const md5 = crypto.createHash('md5').update(uuidv4()).digest('hex').toUpperCase();
		
		const subproto2Msg = this.Subproto2.create({
			f7: params.f7 || '{}', f8: params.f8 || md5, f4: params.f4 || 'file',
			f3: params.f3 || BigInt(1024 ** 6).toString(), f1: params.subproto2F1 || 102, f2: params.f2 || uuidv4()
		});
		
		const subproto7Msg = this.Subproto7.create();
		subproto7Msg.f2 = subproto2Msg;
		rootMsg.f7 = subproto7Msg;
		
		const data = this.Root.encode(rootMsg).finish();
		const final = new Uint8Array(3 + data.length);
		final[0] = 1;
		final[1] = (data.length >> 8) & 0xff;
		final[2] = data.length & 0xff;
		final.set(data, 3);
		
		const hex = Array.from(final).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
		return { "5": { "1": 24, "2": `hex->${hex}` } };
	}
}
