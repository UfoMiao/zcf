#!/usr/bin/env node
import cac from 'cac';
import { setupCommands } from './cli-setup';

const cli = cac('zcf');
setupCommands(cli);
cli.parse();
