import { diffLines, diffWords, diffChars, Change } from 'diff';

export type DiffMode = 'side-by-side' | 'inline' | 'unified';
export type DiffGranularity = 'lines' | 'words' | 'chars';

export interface DiffSegment {
  value: string;
  added?: boolean;
  removed?: boolean;
  count?: number;
}

export interface DiffResult {
  segments: DiffSegment[];
  additions: number;
  deletions: number;
  changes: number;
}

export function computeDiff(
  oldText: string,
  newText: string,
  granularity: DiffGranularity = 'lines'
): DiffResult {
  let changes: Change[];
  
  switch (granularity) {
    case 'words':
      changes = diffWords(oldText, newText);
      break;
    case 'chars':
      changes = diffChars(oldText, newText);
      break;
    case 'lines':
    default:
      changes = diffLines(oldText, newText);
      break;
  }

  let additions = 0;
  let deletions = 0;
  let changeCount = 0;

  const segments: DiffSegment[] = changes.map(change => {
    if (change.added) {
      additions += change.count || 0;
      changeCount++;
    }
    if (change.removed) {
      deletions += change.count || 0;
      changeCount++;
    }
    
    return {
      value: change.value,
      added: change.added,
      removed: change.removed,
      count: change.count
    };
  });

  return {
    segments,
    additions,
    deletions,
    changes: changeCount
  };
}

export function splitIntoLines(text: string): string[] {
  return text.split('\n');
}

export function formatLineNumber(num: number, maxDigits: number): string {
  return num.toString().padStart(maxDigits, ' ');
}

export function computeSideBySideDiff(oldText: string, newText: string) {
  const diff = computeDiff(oldText, newText, 'lines');
  
  const leftLines: Array<{ line: string; lineNumber: number; type: 'normal' | 'removed' | 'empty' }> = [];
  const rightLines: Array<{ line: string; lineNumber: number; type: 'normal' | 'added' | 'empty' }> = [];
  
  let leftLineNum = 1;
  let rightLineNum = 1;
  
  diff.segments.forEach(segment => {
    const lines = segment.value.split('\n').filter(line => line !== '');
    
    if (segment.removed) {
      lines.forEach(line => {
        leftLines.push({ line, lineNumber: leftLineNum++, type: 'removed' });
        rightLines.push({ line: '', lineNumber: -1, type: 'empty' });
      });
    } else if (segment.added) {
      lines.forEach(line => {
        leftLines.push({ line: '', lineNumber: -1, type: 'empty' });
        rightLines.push({ line, lineNumber: rightLineNum++, type: 'added' });
      });
    } else {
      lines.forEach(line => {
        leftLines.push({ line, lineNumber: leftLineNum++, type: 'normal' });
        rightLines.push({ line, lineNumber: rightLineNum++, type: 'normal' });
      });
    }
  });
  
  return { leftLines, rightLines };
}

export function getChangeStats(diff: DiffResult): string {
  const { additions, deletions } = diff;
  const parts = [];
  
  if (additions > 0) {
    parts.push(`+${additions}`);
  }
  if (deletions > 0) {
    parts.push(`-${deletions}`);
  }
  
  return parts.join(', ') || 'No changes';
}