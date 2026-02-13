import { ref } from 'vue';
import { Timeframe } from '../types/Timeframe';

export interface OHLCVData {
  time_received_iso: string;
  stk_no: string;
  open: number;
  close: number;
  min: number;
  max: number;
  volume: number;
}

export function useOHLCVChart() {
  const data = ref<OHLCVData[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchOHLCV = async (
    stkNo: string = '1155.KL',
    timeframe: Timeframe = Timeframe.FifteenMinutes,
    range: string = '$now - 14d..$now'
  ) => {
    loading.value = true;
    error.value = null;

    const tableName = import.meta.env.VITE_QDB_TABLE || 'qdb';
    
    // Use relative path for Vite proxy
    const proxyBaseUrl = '/qdb';
    
    const query = `
      SELECT 
        time_received_iso, stk_no, 
        first(best_bid_price) AS open, 
        last(best_bid_price) AS close, 
        min(best_bid_price) AS min, 
        max(best_bid_price) AS max, 
        sum(volume) AS volume 
      FROM ${tableName} 
      WHERE stk_no = '${stkNo}' AND time_received_iso IN '${range}' 
      SAMPLE BY ${timeframe};
    `.trim();

    try {
      const url = `${proxyBaseUrl}/exec?query=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`QuestDB query failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // QuestDB /exec returns data in 'dataset' property when using default format
      if (result.dataset) {
        data.value = result.dataset.map((row: any[]) => ({
          time_received_iso: row[0],
          stk_no: row[1],
          open: row[2],
          close: row[3],
          min: row[4],
          max: row[5],
          volume: row[6],
        }));
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Failed to fetch OHLCV data:', err);
    } finally {
      loading.value = false;
    }
  };

  return {
    data,
    loading,
    error,
    fetchOHLCV
  };
}
