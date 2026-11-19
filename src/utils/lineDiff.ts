export type DiffLineKind = 'context' | 'add' | 'remove';

export interface DiffLine {
  kind: DiffLineKind;
  content: string;
  oldLine: number | null;
  newLine: number | null;
}

export interface DiffSummary {
  additions: number;
  deletions: number;
  unchanged: number;
  hasChanges: boolean;
}

const MAX_DP_CELLS = 240_000;

export function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  if (oldText === newText) {
    if (!newText) return [];
    return newText.split('\n').map((content, idx) => ({
      kind: 'context',
      content,
      oldLine: idx + 1,
      newLine: idx + 1,
    }));
  }

  const oldLines = oldText === '' ? [] : oldText.split('\n');
  const newLines = newText === '' ? [] : newText.split('\n');

  if (oldLines.length === 0) {
    return newLines.map((content, idx) => ({
      kind: 'add',
      content,
      oldLine: null,
      newLine: idx + 1,
    }));
  }

  if (newLines.length === 0) {
    return oldLines.map((content, idx) => ({
      kind: 'remove',
      content,
      oldLine: idx + 1,
      newLine: null,
    }));
  }

  // Trim identical prefix & suffix before building LCS matrix to stay fast on large files
  let prefixCount = 0;
  while (
    prefixCount < oldLines.length &&
    prefixCount < newLines.length &&
    oldLines[prefixCount] === newLines[prefixCount]
  ) {
    prefixCount++;
  }

  let oldEnd = oldLines.length - 1;
  let newEnd = newLines.length - 1;
  while (oldEnd >= prefixCount && newEnd >= prefixCount && oldLines[oldEnd] === newLines[newEnd]) {
    oldEnd--;
    newEnd--;
  }

  const result: DiffLine[] = [];
  for (let i = 0; i < prefixCount; i++) {
    result.push({
      kind: 'context',
      content: oldLines[i],
      oldLine: i + 1,
      newLine: i + 1,
    });
  }

  const midOld = oldLines.slice(prefixCount, oldEnd + 1);
  const midNew = newLines.slice(prefixCount, newEnd + 1);
  const m = midOld.length;
  const n = midNew.length;

  if (m > 0 || n > 0) {
    if (m * n <= MAX_DP_CELLS) {
      const cols = n + 1;
      const dp = new Int32Array((m + 1) * cols);

      for (let i = m - 1; i >= 0; i--) {
        const rowOffset = i * cols;
        const nextRowOffset = (i + 1) * cols;
        for (let j = n - 1; j >= 0; j--) {
          if (midOld[i] === midNew[j]) {
            dp[rowOffset + j] = dp[nextRowOffset + j + 1] + 1;
          } else {
            const down = dp[nextRowOffset + j];
            const right = dp[rowOffset + j + 1];
            dp[rowOffset + j] = down >= right ? down : right;
          }
        }
      }

      let i = 0;
      let j = 0;
      while (i < m && j < n) {
        if (midOld[i] === midNew[j]) {
          result.push({
            kind: 'context',
            content: midOld[i],
            oldLine: prefixCount + i + 1,
            newLine: prefixCount + j + 1,
          });
          i++;
          j++;
        } else if (dp[(i + 1) * cols + j] >= dp[i * cols + (j + 1)]) {
          result.push({
            kind: 'remove',
            content: midOld[i],
            oldLine: prefixCount + i + 1,
            newLine: null,
          });
          i++;
        } else {
          result.push({
            kind: 'add',
            content: midNew[j],
            oldLine: null,
            newLine: prefixCount + j + 1,
          });
          j++;
        }
      }

      while (i < m) {
        result.push({
          kind: 'remove',
          content: midOld[i],
          oldLine: prefixCount + i + 1,
          newLine: null,
        });
        i++;
      }

      while (j < n) {
        result.push({
          kind: 'add',
          content: midNew[j],
          oldLine: null,
          newLine: prefixCount + j + 1,
        });
        j++;
      }
    } else {
      // Fallback for huge diffs: contiguous removed block + added block
      for (let i = 0; i < m; i++) {
        result.push({
          kind: 'remove',
          content: midOld[i],
          oldLine: prefixCount + i + 1,
          newLine: null,
        });
      }
      for (let j = 0; j < n; j++) {
        result.push({
          kind: 'add',
          content: midNew[j],
          oldLine: null,
          newLine: prefixCount + j + 1,
        });
      }
    }
  }

  for (let i = oldEnd + 1, j = newEnd + 1; i < oldLines.length; i++, j++) {
    result.push({
      kind: 'context',
      content: oldLines[i],
      oldLine: i + 1,
      newLine: j + 1,
    });
  }

  return result;
}

export function summarizeDiff(lines: DiffLine[]): DiffSummary {
  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  for (const line of lines) {
    if (line.kind === 'add') additions++;
    else if (line.kind === 'remove') deletions++;
    else unchanged++;
  }

  return {
    additions,
    deletions,
    unchanged,
    hasChanges: additions > 0 || deletions > 0,
  };
}
