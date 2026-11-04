/**
 * Mathematical Seating Allocation & Graph Theory Utilities.
 * 
 * Provides client-side helpers for checkerboard generation, 
 * bipartite graph 2-coloring, alpha independence bound calculation,
 * and adjacency conflict verification.
 */

import { SeatingPolicy } from '../types';

export interface GridCellCoords {
  row: number;
  col: number;
}

export interface AdjacencyViolation {
  seatA: string;
  seatB: string;
  keyA?: string;
  keyB?: string;
  batch: string;
  type: 'horizontal' | 'vertical' | 'diagonal';
}

export interface AllocatableCell {
  row?: number;
  col?: number;
  batch?: string;
  is_blocked?: boolean;
  student_name?: string;
}

/**
 * Calculates theoretical independence number alpha(G) for a rectangular grid graph P_r box P_c.
 * alpha(P_r box P_c) = ceil(r * c / 2)
 */
export function calculateGridIndependence(rows: number, cols: number): number {
  return Math.ceil((rows * cols) / 2);
}

/**
 * Validates an allocation matrix against seating policies and detects conflicts.
 */
export function checkAllocationConflicts(
  cells: Record<string, AllocatableCell>,
  rows: number,
  cols: number,
  policy: SeatingPolicy
): AdjacencyViolation[] {
  const violations: AdjacencyViolation[] = [];

  const getCell = (r: number, c: number) => cells[`${r}-${c}`];
  const isOccupied = (c?: AllocatableCell): boolean => {
    if (!c || c.is_blocked || !c.batch) return false;
    if ('student_name' in c && !c.student_name) return false;
    return true;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const current = getCell(r, c);
      if (!isOccupied(current) || !current?.batch) continue;

      // Horizontal conflict
      if (policy.block_same_batch_horizontal && c + 1 < cols) {
        const right = getCell(r, c + 1);
        if (isOccupied(right) && right?.batch === current.batch) {
          violations.push({
            seatA: `${String.fromCharCode(65 + r)}${c + 1}`,
            seatB: `${String.fromCharCode(65 + r)}${c + 2}`,
            keyA: `${r}-${c}`,
            keyB: `${r}-${c + 1}`,
            batch: current.batch,
            type: 'horizontal',
          });
        }
      }

      // Vertical conflict
      if (policy.block_same_batch_vertical && r + 1 < rows) {
        const bottom = getCell(r + 1, c);
        if (isOccupied(bottom) && bottom?.batch === current.batch) {
          violations.push({
            seatA: `${String.fromCharCode(65 + r)}${c + 1}`,
            seatB: `${String.fromCharCode(65 + r + 1)}${c + 1}`,
            keyA: `${r}-${c}`,
            keyB: `${r + 1}-${c}`,
            batch: current.batch,
            type: 'vertical',
          });
        }
      }

      // Diagonal conflict
      if (policy.block_same_batch_diagonal && r + 1 < rows) {
        if (c + 1 < cols) {
          const diagRight = getCell(r + 1, c + 1);
          if (isOccupied(diagRight) && diagRight?.batch === current.batch) {
            violations.push({
              seatA: `${String.fromCharCode(65 + r)}${c + 1}`,
              seatB: `${String.fromCharCode(65 + r + 1)}${c + 2}`,
              keyA: `${r}-${c}`,
              keyB: `${r + 1}-${c + 1}`,
              batch: current.batch,
              type: 'diagonal',
            });
          }
        }
        if (c - 1 >= 0) {
          const diagLeft = getCell(r + 1, c - 1);
          if (isOccupied(diagLeft) && diagLeft?.batch === current.batch) {
            violations.push({
              seatA: `${String.fromCharCode(65 + r)}${c + 1}`,
              seatB: `${String.fromCharCode(65 + r + 1)}${c}`,
              keyA: `${r}-${c}`,
              keyB: `${r + 1}-${c - 1}`,
              batch: current.batch,
              type: 'diagonal',
            });
          }
        }
      }
    }
  }

  return violations;
}
