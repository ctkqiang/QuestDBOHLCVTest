<template>
  <div class="ohlcv-container">
    <div class="controls">
      <select v-model="selectedStkNo" @change="refreshData">
        <option value="1155.KL">1155.KL</option>
        <option value="7113.KL">7113.KL</option>
      </select>
      
      <select v-model="selectedTimeframe" @change="refreshData">
        <option v-for="(value, key) in Timeframe" :key="key" :value="value">
          {{ key }}
        </option>
      </select>

      <button :disabled="loading" @click="refreshData">
        {{ loading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <v-chart class="chart" :option="chartOption" autoresize />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { CandlestickChart, BarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  VisualMapComponent,
  DataZoomComponent,
} from 'echarts/components';
import VChart from 'vue-echarts';
import { useOHLCVChart } from '../composables/useOHLCVChart';
import { Timeframe } from '../types/Timeframe';

// Register ECharts modules
use([
  CanvasRenderer,
  CandlestickChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  VisualMapComponent,
  DataZoomComponent,
]);

const { data, loading, error, fetchOHLCV } = useOHLCVChart();

const selectedStkNo = ref('1155.KL');
const selectedTimeframe = ref<Timeframe>(Timeframe.FifteenMinutes);

const refreshData = () => {
  fetchOHLCV(selectedStkNo.value, selectedTimeframe.value);
};

onMounted(() => {
  refreshData();
});

const chartOption = computed(() => {
  const dates = data.value.map(item => item.time_received_iso);
  const values = data.value.map(item => [
    item.open,
    item.close,
    item.min,
    item.max,
    item.volume
  ]);

  return {
    backgroundColor: '#100c2a',
    title: {
      text: `${selectedStkNo.value} OHLCV`,
      left: 20,
      top: 10,
      textStyle: {
        color: '#eee'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      backgroundColor: 'rgba(50, 50, 50, 0.7)',
      borderColor: '#333',
      textStyle: {
        color: '#fff'
      }
    },
    grid: [
      {
        left: '50',
        right: '50',
        height: '65%',
        top: '60'
      },
      {
        left: '50',
        right: '50',
        top: '78%',
        height: '15%'
      }
    ],
    xAxis: [
      {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLine: { onZero: false, lineStyle: { color: '#8392A5' } },
        splitLine: { show: false },
        min: 'dataMin',
        max: 'dataMax'
      },
      {
        type: 'category',
        gridIndex: 1,
        data: dates,
        boundaryGap: false,
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        min: 'dataMin',
        max: 'dataMax'
      }
    ],
    yAxis: [
      {
        scale: true,
        axisLine: { lineStyle: { color: '#8392A5' } },
        splitLine: { show: true, lineStyle: { color: '#272446' } }
      },
      {
        scale: true,
        gridIndex: 1,
        splitNumber: 2,
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false }
      }
    ],
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: [0, 1],
        start: 50,
        end: 100
      },
      {
        show: true,
        xAxisIndex: [0, 1],
        type: 'slider',
        top: '94%',
        start: 50,
        end: 100,
        textStyle: {
          color: '#8392A5'
        },
        handleIcon: 'path://M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
        handleSize: '80%',
        dataBackground: {
          areaStyle: {
            color: '#8392A5'
          },
          lineStyle: {
            opacity: 0.8,
            color: '#8392A5'
          }
        },
        selectedDataBackground: {
          lineStyle: {
            color: '#fff'
          },
          areaStyle: {
            color: '#fff'
          }
        },
        brushSelect: true
      }
    ],
    series: [
      {
        name: 'Candlestick',
        type: 'candlestick',
        data: values.map(v => v.slice(0, 4)),
        itemStyle: {
          color: '#ef232a',
          color0: '#14b143',
          borderColor: '#ef232a',
          borderColor0: '#14b143'
        }
      },
      {
        name: 'Volume',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: values.map((v) => {
          const itemOpen = v[0] ?? 0;
          const itemClose = v[1] ?? 0;
          const isUp = itemClose >= itemOpen;
          return {
            value: v[4] ?? 0,
            itemStyle: {
              color: isUp ? '#ef232a' : '#14b143'
            }
          };
        })
      }
    ]
  };
});
</script>

<style scoped>
.ohlcv-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #100c2a;
  color: #ccc;
  overflow: hidden;
}

.controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 10;
}

.chart {
  flex: 1;
  width: 100%;
}

.error-message {
  position: absolute;
  top: 4rem;
  right: 1.5rem;
  z-index: 100;
  color: #ff4d4f;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

select, button {
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
  border: 1px solid #444;
  background: #222;
  color: #eee;
  font-size: 0.9rem;
  outline: none;
}

select:hover, button:hover:not(:disabled) {
  border-color: #1890ff;
}

button {
  background: #1890ff;
  border-color: #1890ff;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

button:hover:not(:disabled) {
  background: #40a9ff;
}

button:disabled {
  background: #333;
  border-color: #444;
  color: #666;
  cursor: not-allowed;
}
</style>
