import { createESENV } from './core.js';

var __esenvRoot: any = null;
var __esenvDollar: any = null;
try {
  if (typeof $ !== 'undefined' && $.global) {
    __esenvRoot = $.global;
    __esenvDollar = $;
  }
} catch (error) {
  __esenvRoot = null;
  __esenvDollar = null;
}

if (__esenvRoot !== null) {
  __esenvRoot['ESENV'] = createESENV(__esenvRoot, __esenvDollar);
}
