import { buildBoard } from '../../src/lib/games/memoryHeistEngine';
console.log(JSON.stringify(buildBoard(24,'shared-seed',6).map(tile=>tile.pairId)));
