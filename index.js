import chalk from 'chalk';
import byteNode from 'bytenode';
const { runBytecode } = byteNode;
const logger = global.logger || console;
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import os from 'os';
let osType = os.type();
if (osType === 'Windows_NT') {
	osType = 'windows';
} else {
	osType = 'linux';
}
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
global.Bot.hack = {};
function log(data) {
	if (Array.isArray(data)) {
		return data.map((i) => log(i));
	}
	if (typeof data === 'object' && data !== null) {
		Object.keys(data).forEach((i) => {
			data[i] = log(data[i]);
		});
		return data;
	}
	data = String(data);
	const styleMethods = [
		'black',
		'red',
		'green',
		'yellow',
		'blue',
		'magenta',
		'cyan',
		'white',
		'blackBright',
		'redBright',
		'greenBright',
		'yellowBright',
		'blueBright',
		'magentaBright',
		'cyanBright',
		'whiteBright'
	];
	data = data.split('');
	data = data.map((char) => {
		const method = styleMethods[Math.floor(Math.random() * styleMethods.length)];
		return chalk[method](char);
	});
	return data.join('');
}
const isTRSS = !!Bot.serverHandle;
if (isTRSS) {
	try {
		if (fs.statSync(path.join(process.cwd(), 'plugins', 'ICQQ-Plugin')).isDirectory()) setICQQ();
	} catch {}
} else {
	Bot.hack.icqq = await import('icqq');
}
delete Bot.hack.icqq;
async function setICQQ() {
	let icqq;
	for (const i of ['Model', 'node_modules']) {
		try {
			const dir = `${process.cwd()}/plugins/ICQQ-Plugin/${i}/icqq/`;
			if (!fs.statSync(dir)) continue;
			icqq = (await import(`file://${dir}lib/index.js`)).default;
			Bot.hack.icqq = icqq;
			await runBytecode(await getFnc('setRaw'));
			break;
		} catch (err) {
			icqq = err;
		}
	}
	logger.info(log('[hack-plugin] ICQQ - Raw 加载成功'));
}
async function setNapCat() {}
function getFnc(name) {
	return fs.readFileSync(path.join(__dirname, 'fnc', `${name}-${osType}`));
}
export class fakeFile extends plugin {
	constructor() {
		super({
			name: 'getButton',
			dsc: 'getButton',
			event: 'message',
			priority: -5000,
			rule: [
				{
					reg: /^#文件/i,
					fnc: 'getButton',
					permission: 'master'
				}
			]
		});
	}
	async getButton(e) {
		const encoder = new ProtobufEncoder(path.join(__dirname, 'file.proto'));
		await encoder.loadProtoFile();
		const match = e.msg.match(/^#文件\s*(.+)\s+(\d+)?/);
		if (!match) {
			await e.reply('格式错误，请使用 "#文件 文件名 文件大小"');
			return;
		}
		let [_, name, size] = match;
		const params = {
			f1: 6,
			f7: '{"info": "嘿客"}',
			f4: name,
			f3: size,
			subproto2F1: 103
		};
		const result = await encoder.createAndSerializeMessage(params);
		if (e.bot.adapter?.name == 'QQBot') await e.reply(JSON.stringify(result, null, 2));
		await e.reply(segment.raw(result));
	}
}
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import protobuf from 'protobufjs';
class ProtobufEncoder {
	constructor() {
		this.Root = null;
		this.Subproto2 = null;
		this.Subproto7 = null;
	}

	async loadProtoFile() {
		const proto = `
syntax = "proto2";

message root {
    optional subproto7 f7 = 7;
    optional uint32 f1 = 1;
}

message subproto7 {
    optional subproto2 f2 = 2;
}

message subproto2 {
    optional string f7 = 7;
    optional string f8 = 8;
    optional string f4 = 4;
    optional uint64 f3 = 3;
    optional uint32 f1 = 1;
    optional string f2 = 2;
}
`;
		const root = protobuf.parse(proto).root;
		this.Root = root.lookupType('root');
		this.Subproto2 = root.lookupType('subproto2');
		this.Subproto7 = root.lookupType('subproto7');
	}

	generateMD5(input) {
		return crypto.createHash('md5').update(input).digest('hex').toUpperCase();
	}

	toHexString(bytes) {
		return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '').toUpperCase();
	}

	async createAndSerializeMessage(params) {
		if (!this.Root || !this.Subproto2 || !this.Subproto7) {
			throw new Error('Proto file not loaded. Please call loadProtoFile first.');
		}

		const rootMsg = this.Root.create();
		rootMsg.f1 = params.f1 || 6;

		const randomString = uuidv4();
		const md5Hash = this.generateMD5(randomString);

		const subproto2Msg = this.Subproto2.create({
			f7: params.f7 || '{"info": "powered by ono"}',
			f8: params.f8 || md5Hash,
			f4: params.f4 || '默认文件名',
			f3: params.f3 || BigInt(1024 ** 6).toString(),
			f1: params.subproto2F1 || 102,
			f2: params.f2 || uuidv4()
		});

		const subproto7Msg = this.Subproto7.create();
		subproto7Msg.f2 = subproto2Msg;

		rootMsg.f7 = subproto7Msg;

		const serializedData = this.Root.encode(rootMsg).finish();

		const lengthBytes = new Uint8Array(2);
		lengthBytes[0] = (serializedData.length >> 8) & 0xff;
		lengthBytes[1] = serializedData.length & 0xff;

		const finalByteArray = new Uint8Array(1 + 2 + serializedData.length);
		finalByteArray[0] = 1;
		finalByteArray.set(lengthBytes, 1);
		finalByteArray.set(serializedData, 3);

		const hexOutput = this.toHexString(finalByteArray);

		let result = `
        {
          "5": {
            "1": 24,
            "2": "hex->${hexOutput}"
          }
        }
        `.trim();
		result = JSON.parse(result);
		return result;
	}
}
