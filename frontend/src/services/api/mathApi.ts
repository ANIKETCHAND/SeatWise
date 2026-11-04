import { request } from './client';

export const mathApi = {
  mathCapacity: (rows: number, columns: number, blocked: number[][]) =>
    request<any>('/math/capacity', { method: 'POST', body: JSON.stringify({ rows, columns, blocked }) }),
  mathCheckerboard: (rows: number, columns: number, class_a: number, class_b: number) =>
    request<any>('/math/checkerboard', { method: 'POST', body: JSON.stringify({ rows, columns, class_a, class_b }) }),
  mathAdjacency: (payload: any) =>
    request<any>('/math/adjacency', { method: 'POST', body: JSON.stringify(payload) }),
  mathSolve: (payload: any) =>
    request<any>('/math/solve', { method: 'POST', body: JSON.stringify(payload) }),
};
