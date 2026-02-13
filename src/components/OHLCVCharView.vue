<template>
  <div class="ohlcv-container">
    <div class="controls">
      <select v-model="selectedStkNo" @change="refreshData">
        <option value="01810">01810.HK (小米)</option>
        <option value="1155.KL">1155.KL (MAYBANK)</option>
        <option value="7113.KL">7113.KL (TOPGLOV)</option>
      </select>
      
      <select v-model="selectedTimeframe" @change="refreshData">
        <option v-for="(value, key) in Timeframe" :key="key" :value="value">
          {{ key === 'OneMinute' ? '1分钟' : 
             key === 'FiveMinutes' ? '5分钟' : 
             key === 'FifteenMinutes' ? '15分钟' : 
             key === 'OneHour' ? '1小时' : 
             key === 'OneDay' ? '日线' : key }}
        </option>
      </select>

      <button :disabled="loading" @click="refreshData">
        {{ loading ? '加载中...' : '刷新数据' }}
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
import '../styles/chartStyle.css';

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
    backgroundColor: '#ffffff',
    title: {
      text: `${selectedStkNo.value} K线图`,
      left: 20,
      top: 10,
      textStyle: {
        color: '#333'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      borderColor: '#ccc',
      textStyle: {
        color: '#333'
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
        axisLine: { onZero: false, lineStyle: { color: '#333' } },
        splitLine: { show: false },
        axisLabel: { color: '#666' },
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
        axisLine: { lineStyle: { color: '#333' } },
        splitLine: { show: true, lineStyle: { color: '#eee' } },
        axisLabel: { color: '#666' }
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
          color: '#333'
        },
        handleIcon: 'path://M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
        handleSize: '80%',
        dataBackground: {
          areaStyle: {
            color: '#ccc'
          },
          lineStyle: {
            opacity: 0.8,
            color: '#ccc'
          }
        },
        selectedDataBackground: {
          lineStyle: {
            color: '#1890ff'
          },
          areaStyle: {
            color: '#1890ff',
            opacity: 0.1
          }
        },
        brushSelect: true
      }
    ],
    series: [
      {
        name: '日K',
        type: 'candlestick',
        data: values.map(v => v.slice(0, 4)),
        itemStyle: {
          color: '#ef232a',      // 阳线填充（红）
          color0: '#14b143',     // 阴线填充（绿）
          borderColor: '#ef232a', // 阳线边框（红）
          borderColor0: '#14b143' // 阴线边框（绿）
        }
      },
      {
        name: '成交量',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: values.map((v) => {
          const itemOpen = v[0] ?? 0;
          const itemClose = v[1] ?? 0;
          const isUp = itemClose >= itemOpen; // 收盘 >= 开盘 为涨
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
