<template>
  <div class="ohlcv-container">
    <!-- 顶部导航栏 -->
    <header class="dev-toolbar">
      <div class="brand">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
        </svg>
        QuestDB Console
      </div>
      <div class="toolbar-actions">
        <!-- 预留扩展区域 -->
      </div>
    </header>

    <main class="dev-main">
      <!-- 左侧编辑器侧边栏 -->
      <aside class="dev-sidebar">
        <div class="editor-tabs">
          <div class="tab-item active">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            query.sql
          </div>
        </div>
        
        <div class="query-container">
          <!-- 模拟行号 -->
          <div class="line-numbers">
            <div v-for="n in lineCount" :key="n">{{ n }}</div>
          </div>
          <textarea 
            v-model="sqlQuery" 
            placeholder="请输入 SQL 查询..."
            spellcheck="false"
            @keydown.ctrl.enter="refreshData"
          ></textarea>
        </div>

        <div class="editor-actions">
          <span class="shortcut-hint">Ctrl + Enter 运行</span>
          <button class="btn-run" :disabled="loading" @click="refreshData">
            <svg v-if="!loading" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <div v-else class="spinner"></div>
            {{ loading ? '执行中...' : '运行查询' }}
          </button>
        </div>
      </aside>

      <!-- 右侧图表展示区 -->
      <section class="dev-content">
        <!-- 错误提示层 -->
        <div v-if="error" class="error-panel">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div>
            <strong>查询错误:</strong> {{ error }}
          </div>
        </div>
        
        <v-chart class="chart" :option="chartOption" autoresize />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { CandlestickChart, BarChart, LineChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  VisualMapComponent,
  DataZoomComponent,
} from 'echarts/components';
import VChart from 'vue-echarts';
import { useOHLCVChart } from '../composables/useOHLCVChart';
import '../styles/chartStyle.css';

// 注册 ECharts 核心组件
use([
  CanvasRenderer,
  CandlestickChart,
  BarChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  VisualMapComponent,
  DataZoomComponent,
]);

const { data, loading, error, fetchOHLCV } = useOHLCVChart();

// 初始化 SQL 查询语句
const tableName = import.meta.env.VITE_QDB_TABLE || 'qdb';
const sqlQuery = ref(`SELECT 
  time_received_iso, stk_no, 
  first(best_bid_price) AS open, 
  last(best_bid_price) AS close, 
  min(best_bid_price) AS min, 
  max(best_bid_price) AS max, 
  sum(volume) AS volume 
FROM ${tableName} 
WHERE stk_no = '1155.KL' 
  AND time_received_iso IN '$now - 14d..$now' 
SAMPLE BY 15m;`);

// 计算编辑器行数
const lineCount = computed(() => sqlQuery.value.split('\n').length || 1);

// 刷新数据方法
const refreshData = () => {
  fetchOHLCV(sqlQuery.value);
};

onMounted(() => {
  refreshData();
});

// ECharts 配置项计算属性
const chartOption = computed(() => {
  // 从 SQL 中提取股票代码用于标题展示
  const stkMatch = sqlQuery.value.match(/stk_no\s*=\s*['"]([^'"]+)['"]/i);
  const displayStk = stkMatch ? stkMatch[1] : 'QuestDB';

  const dates = data.value.map(item => item.time_received_iso);
  const values = data.value.map(item => [
    item.open,
    item.close,
    item.min,
    item.max,
    item.volume
  ]);

  return {
    backgroundColor: '#1e1e1e', // 匹配 VS Code 编辑器背景色
    title: {
      text: `${displayStk} 行情分析`,
      left: 30,
      top: 20,
      textStyle: {
        color: '#cccccc',
        fontSize: 14,
        fontWeight: 400
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { 
        type: 'cross',
        lineStyle: { color: '#454545', type: 'dashed' }
      },
      backgroundColor: '#252526',
      borderColor: '#454545',
      borderWidth: 1,
      textStyle: { color: '#cccccc', fontSize: 12 },
      extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.5); border-radius: 2px;'
    },
    grid: [
      { left: '60', right: '40', height: '65%', top: '80' },
      { left: '60', right: '40', top: '78%', height: '12%' }
    ],
    xAxis: [
      {
        type: 'category',
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#454545' } },
        splitLine: { show: true, lineStyle: { color: '#333', type: 'dashed' } },
        axisLabel: { color: '#858585', fontSize: 11 },
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
        axisLine: { show: false },
        splitLine: { show: true, lineStyle: { color: '#333' } },
        axisLabel: { color: '#858585', fontSize: 11 }
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
      { type: 'inside', xAxisIndex: [0, 1], start: 10, end: 100 },
      {
        show: true,
        xAxisIndex: [0, 1],
        type: 'slider',
        bottom: 20,
        start: 10,
        end: 100,
        height: 20,
        handleSize: '100%',
        handleStyle: { color: '#404040' },
        textStyle: { color: '#858585' },
        fillerColor: 'rgba(14, 99, 156, 0.2)',
        borderColor: '#454545'
      }
    ],
    series: [
      {
        name: '价格',
        type: 'candlestick',
        data: values.map(v => v.slice(0, 4)),
        barMaxWidth: '60%', // 限制 K 线最大宽度，防止数据量少时显得过大
        itemStyle: {
          color: '#ef5350',      // 上涨 (红色)
          color0: '#26a69a',     // 下跌 (绿色)
          borderColor: '#ef5350',
          borderColor0: '#26a69a'
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
          const isUp = itemClose >= itemOpen;
          return {
            value: v[4] ?? 0,
            itemStyle: { color: isUp ? 'rgba(239, 83, 80, 0.5)' : 'rgba(38, 166, 154, 0.5)' }
          };
        })
      }
    ]
  };
});
</script>
