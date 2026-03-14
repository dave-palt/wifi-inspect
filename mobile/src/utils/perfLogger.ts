import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface LogEntry {
  timestamp: number;
  category: string;
  event: string;
  duration?: number;
  data?: Record<string, unknown>;
}

class PerformanceLogger {
  private logs: LogEntry[] = [];
  private marks: Map<string, number> = new Map();
  private enabled: boolean = true;
  private maxLogs: number = 2000;

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  mark(name: string) {
    if (!this.enabled) return;
    this.marks.set(name, performance.now());
  }

  measure(name: string, startMark: string, data?: Record<string, unknown>) {
    if (!this.enabled) return;
    
    const startTime = this.marks.get(startMark);
    if (startTime === undefined) {
      this.log('warn', `Start mark "${startMark}" not found`);
      return;
    }
    
    const duration = performance.now() - startTime;
    this.log(name, `${duration.toFixed(2)}ms`, { ...data, duration });
    this.marks.delete(startMark);
    
    return duration;
  }

  log(category: string, event: string, data?: Record<string, unknown>) {
    if (!this.enabled) return;
    
    const entry: LogEntry = {
      timestamp: Date.now(),
      category,
      event,
      data,
    };
    
    if (data?.duration !== undefined) {
      entry.duration = data.duration as number;
    }
    
    this.logs.push(entry);
    
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    console.log(`[${category}] ${event}`, data || '');
  }

  startTrace(name: string) {
    this.mark(`start:${name}`);
    this.log('trace', `START: ${name}`);
  }

  endTrace(name: string, data?: Record<string, unknown>) {
    const duration = this.measure(`trace:${name}`, `start:${name}`, data);
    this.log('trace', `END: ${name}`, { ...data, duration });
    return duration;
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    this.marks.clear();
  }

  formatLogsForExport(): string {
    const lines = this.logs.map(log => {
      const time = new Date(log.timestamp).toISOString().split('T')[1];
      const durationStr = log.duration ? ` (${log.duration.toFixed(2)}ms)` : '';
      const dataStr = log.data ? ` | ${JSON.stringify(log.data)}` : '';
      return `[${time}] [${log.category}] ${log.event}${durationStr}${dataStr}`;
    });
    
    return lines.join('\n');
  }

  async exportToFile(): Promise<string | null> {
    try {
      const fileName = `perf-logs-${Date.now()}.txt`;
      const documentDir = (FileSystem as unknown as { Paths: { document: { uri: string } } }).Paths?.document?.uri;
      
      if (!documentDir) {
        console.error('Document directory not available');
        return null;
      }
      
      const filePath = `${documentDir}${fileName}`;
      const content = this.formatLogsForExport();
      
      await FileSystem.writeAsStringAsync(filePath, content);
      
      return filePath;
    } catch (error) {
      console.error('Failed to export logs:', error);
      return null;
    }
  }

  async shareLogs() {
    try {
      const filePath = await this.exportToFile();
      if (!filePath) {
        console.error('Failed to create log file');
        return;
      }
      
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        console.log('Sharing not available. Log file saved to:', filePath);
        return;
      }
      
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/plain',
        dialogTitle: 'Share Performance Logs',
      });
    } catch (error) {
      console.error('Failed to share logs:', error);
    }
  }

  getSummary(): {
    totalLogs: number;
    categories: Record<string, number>;
    slowOperations: LogEntry[];
  } {
    const categories: Record<string, number> = {};
    const slowOperations: LogEntry[] = [];
    
    for (const log of this.logs) {
      categories[log.category] = (categories[log.category] || 0) + 1;
      
      if (log.duration && log.duration > 100) {
        slowOperations.push(log);
      }
    }
    
    return {
      totalLogs: this.logs.length,
      categories,
      slowOperations: slowOperations.sort((a, b) => (b.duration || 0) - (a.duration || 0)),
    };
  }
}

export const perfLogger = new PerformanceLogger();
