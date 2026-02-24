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
          <div class="editor-scroll-container">
            <div class="code-highlight" v-html="highlightedCode"></div>
            <textarea 
              v-model="sqlQuery" 
              placeholder="请输入 SQL 查询..."
              spellcheck="false"
              @keydown.ctrl.enter="refreshData"
            ></textarea>
          </div>
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
        <!-- 顶部信息栏 -->
        <div class="chart-header">
          <span class="symbol">{{ displayStk }} 行情分析</span>
          <div class="ohlc-data" v-if="currentOHLC">
            <span>O: <span :class="currentOHLC.close >= currentOHLC.open ? 'text-up' : 'text-down'">{{ currentOHLC.open }}</span></span>
            <span>H: <span :class="currentOHLC.close >= currentOHLC.open ? 'text-up' : 'text-down'">{{ currentOHLC.high }}</span></span>
            <span>L: <span :class="currentOHLC.close >= currentOHLC.open ? 'text-up' : 'text-down'">{{ currentOHLC.low }}</span></span>
            <span>C: <span :class="currentOHLC.close >= currentOHLC.open ? 'text-up' : 'text-down'">{{ currentOHLC.close }}</span></span>
            <span>V: {{ currentOHLC.volume }}</span>
            <span class="time">{{ currentOHLC.time_received_iso }}</span>
          </div>
        </div>

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
        
        <v-chart class="chart" :option="chartOption" autoresize @highlight="onHighlight" @globalout="onGlobalOut" />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
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
WHERE stk_no = '01810.HK' 
  AND time_received_iso IN '$now - 14d..$now' 
SAMPLE BY 15m;`);

// 计算编辑器行数
const lineCount = computed(() => sqlQuery.value.split('\n').length || 1);

// SQL 语法高亮逻辑
const highlightedCode = computed(() => {
  const code = sqlQuery.value;
  if (!code) return '';

  // HTML 转义防止 XSS
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  
  let html = escapeHtml(code);


  // 关键字列表 (GitHub Light Red: #cf222e)
  const keywords = /\b(SELECT|FROM|WHERE|AND|OR|AS|IN|SAMPLE BY|LIMIT|ORDER BY|GROUP BY|LEFT JOIN|RIGHT JOIN|INNER JOIN|ON|DISTINCT|CASE|WHEN|THEN|ELSE|END|CREATE|TABLE|DROP|ALTER|INSERT|INTO|VALUES|UPDATE|DELETE|UNION|ALL|LATEST|ON)\b/gi;
  
  // 函数列表 (GitHub Light Purple: #8250df)
  const functions = /\b(first|last|min|max|sum|avg|count|abs|round|floor|ceil|to_str|to_date|to_timestamp|now|date_trunc)\b/gi;

  // QuestDB 特有时间单位/数字 (GitHub Light Blue: #0550ae)
  const numbers = /\b\d+(\.\d+)?(us|ms|s|m|h|d)?\b/gi;

  const tokens: string[] = [];
  const regex = /(--.*$)|('([^'\\]|\\.)*')|("([^"\\]|\\.)*")|(\b\d+(\.\d+)?(us|ms|s|m|h|d)?\b)|(\b(SELECT|FROM|WHERE|AND|OR|AS|IN|SAMPLE BY|LIMIT|ORDER BY|GROUP BY|LEFT JOIN|RIGHT JOIN|INNER JOIN|ON|DISTINCT|CASE|WHEN|THEN|ELSE|END|CREATE|TABLE|DROP|ALTER|INSERT|INTO|VALUES|UPDATE|DELETE|UNION|ALL|LATEST|ON)\b)|(\b(first|last|min|max|sum|avg|count|abs|round|floor|ceil|to_str|to_date|to_timestamp|now|date_trunc)\b)|([a-zA-Z_]\w*)|(\s+)|(.)/gim;

  let match;
  
  // 重置正则索引
  regex.lastIndex = 0;

  while ((match = regex.exec(code)) !== null) {
    const fullMatch = match[0];
    const comment = match[1];
    const strSingle = match[2];
    const strDouble = match[4];
    const number = match[6];
    const keyword = match[9];
    const func = match[11];
    // identifier (match[13]), whitespace (match[14]), other (match[15]) are just treated as text

    if (comment) {
      tokens.push(`<span class="hl-comment">${escapeHtml(comment)}</span>`);
    } else if (strSingle || strDouble) {
      tokens.push(`<span class="hl-string">${escapeHtml(fullMatch)}</span>`);
    } else if (number) {
      tokens.push(`<span class="hl-number">${escapeHtml(fullMatch)}</span>`);
    } else if (keyword) {
      // 保持原有大小写，或者统一大写
      tokens.push(`<span class="hl-keyword">${escapeHtml(fullMatch)}</span>`); 
    } else if (func) {
      tokens.push(`<span class="hl-function">${escapeHtml(fullMatch)}</span>`);
    } else {
      tokens.push(escapeHtml(fullMatch));
    }
  }

  // 如果最后有一个换行符，可能会被忽略导致行高不对，添加一个零宽空格或者不处理（white-space: pre handles it usually, but last newline might need help）
  // 实际上 textarea 的 value 如果以 \n 结尾，显示时会多一行。
  if (code.endsWith('\n')) {
    tokens.push('\n'); 
  }

  return tokens.join('');
});

// 刷新数据方法
const refreshData = () => {
  fetchOHLCV(sqlQuery.value);
};

// 当前展示的 OHLC 数据
const currentOHLC = ref<any>(null);

// 更新 OHLC 数据
const updateOHLC = (index: number) => {
  if (data.value && data.value[index]) {
    currentOHLC.value = data.value[index];
  }
};

// 监听数据变化，默认显示最后一条
watch(data, (newData) => {
  if (newData && newData.length > 0) {
    updateOHLC(newData.length - 1);
  }
});

// 处理高亮事件 (鼠标悬停)
const onHighlight = (params: any) => {
  // params.batch[0].dataIndex
  if (params.batch && params.batch.length > 0) {
    updateOHLC(params.batch[0].dataIndex);
  }
};

// 处理鼠标移出图表区域
const onGlobalOut = () => {
  if (data.value && data.value.length > 0) {
    updateOHLC(data.value.length - 1);
  }
};

onMounted(() => {
  refreshData();
});

// 提取股票代码
const displayStk = computed(() => {
  const stkMatch = sqlQuery.value.match(/stk_no\s*=\s*['"]([^'"]+)['"]/i);
  return stkMatch ? stkMatch[1] : 'QuestDB';
});

// ECharts 配置项计算属性
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
    backgroundColor: '#ffffff', // 匹配 VS Code 浅色模式背景色
    // title 移除，使用自定义 HTML 覆盖层
    tooltip: {
      trigger: 'axis',
      axisPointer: { 
        type: 'cross',
        lineStyle: { color: '#cccccc', type: 'dashed' }
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e0e0e0',
      borderWidth: 1,
      textStyle: { color: '#333333', fontSize: 12 },
      extraCssText: 'box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 4px;'
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
        axisLine: { lineStyle: { color: '#d0d0d0' } },
        splitLine: { show: true, lineStyle: { color: '#f0f0f0', type: 'dashed' } },
        axisLabel: { color: '#666666', fontSize: 11 },
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
        splitLine: { show: true, lineStyle: { color: '#f0f0f0' } },
        axisLabel: { color: '#666666', fontSize: 11 }
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
        handleStyle: { color: '#ffffff', borderColor: '#d0d0d0' },
        textStyle: { color: '#666666' },
        fillerColor: 'rgba(0, 122, 204, 0.1)',
        borderColor: '#e0e0e0'
      }
    ],
    series: [
      {
        name: '价格',
        type: 'candlestick',
        data: values.map(v => v.slice(0, 4)),
        barMaxWidth: '60%', // 限制 K 线最大宽度，防止数据量少时显得过大
        itemStyle: {
          color: '#cf222e',      // 上涨 (红色 - GitHub Red)
          color0: '#1a7f37',     // 下跌 (绿色 - GitHub Green)
          borderColor: '#cf222e',
          borderColor0: '#1a7f37'
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
            itemStyle: { color: isUp ? 'rgba(207, 34, 46, 0.5)' : 'rgba(26, 127, 55, 0.5)' }
          };
        })
      }
    ]
  };
});
</script>
