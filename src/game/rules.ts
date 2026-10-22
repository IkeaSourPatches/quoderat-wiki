export type Puzzle = {id:string;title:{en:string;zh:string};width:number;height:number;regions:{id:number;points:number[][]}[];borders:{regions:number[];points:number[][]}[]};
export function conflicts(puzzle: Puzzle, colours: number[]) {
  return puzzle.borders.filter(({regions:[a,b]}) => colours[a] >= 0 && colours[a] === colours[b]);
}
export function solved(puzzle: Puzzle, colours: number[]) {
  return colours.length === puzzle.regions.length && colours.every(c => Number.isInteger(c) && c >= 0 && c < 4) && !conflicts(puzzle,colours).length;
}
export function restoreColours(value: unknown, count: number): number[] {
  return Array.isArray(value) && value.length === count && value.every(c => Number.isInteger(c) && c >= -1 && c < 4) ? [...value] : Array(count).fill(-1);
}
