//#!/usr/bin/env node
import * as path from 'path';
const cwd:string = path.resolve(__dirname) || process.cwd()
process.env.ipcCWD = cwd
const ipcTitle = 'ETP-IPCHost',
process.title = ipcTitle
require("../lib/init")
