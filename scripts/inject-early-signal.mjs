#!/usr/bin/env node
// Compatibility entry point. The project-scoped generator owns every waitlist.
// This alias cannot recreate the retired generic Web3Forms capture path.
import { build } from './build-project-waitlists.mjs';
import { readAvailability } from './lib/public-availability.mjs';
const args=process.argv.slice(2);
if(args.some(arg=>arg!=='--dry-run')||args.length>1)throw Error('Use --dry-run, or scripts/build-project-waitlists.mjs --apply');
const root=process.cwd(),changes=build(root,{apply:!args.includes('--dry-run')});
const pages=changes.filter(file=>file.endsWith('/index.html')).length;
const total=readAvailability(root).waitlists.projectCount;
console.log('Done. Injected: '+pages+', Skipped: '+(total-pages)+' (canonical project-specific forms; dry-run='+args.includes('--dry-run')+')');
