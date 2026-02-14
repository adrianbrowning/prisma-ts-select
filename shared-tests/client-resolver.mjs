// Custom Node loader to resolve #client imports based on CLIENT_PACKAGE env var
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('file://' + new URL('.', import.meta.url).pathname + 'client-loader-impl.mjs', pathToFileURL('./'));