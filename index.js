import chalk from 'chalk';
import byteNode from 'bytenode';
const { runBytecode } = byteNode;
const logger = global.logger || console;
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
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
}
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
	return fs.readFileSync(path.join(__dirname, 'fnc', name));
}
