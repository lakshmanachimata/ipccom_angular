//#!/usr/bin/env node
import * as path from 'path';
//capture bin folder to be used as current working directory across the board;
const cwd:string = path.resolve(__dirname) || process.cwd();
process.env.ipcCWD = cwd;
const ipcTitle = 'ETP-IPCHost';
process.title = ipcTitle;
require('../lib/init');
