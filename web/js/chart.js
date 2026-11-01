/* Rubliks Web - candlestick and volume charts (Lightweight Charts) */

let candleChart = null;
let volumeChart = null;

function destroyCharts() {
  if (candleChart) {
    candleChart.remove();
    candleChart = null;
  }
  if (volumeChart) {
    volumeChart.remove();
    volumeChart = null;
  }
}

function buildCharts(containerId, volumeContainerId, candles) {
  destroyCharts();
  const container = document.getElementById(containerId);
  const volContainer = document.getElementById(volumeContainerId);
  if (!container || !volContainer || !candles || candles.length === 0) return null;

  const candleSeries = candles.map(c => ({
    time: c.time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close
  }));

  const volSeries = candles.map(c => ({
    time: c.time,
    value: c.volume || 0
  }));

  var LW = LightweightCharts;
  var fontStack = '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  var chartOptions = {
    layout: {
      background: { type: 'solid', color: '#FFFFFF' },
      textColor: '#64748B',
      fontSize: 11,
      fontFamily: fontStack
    },
    grid: {
      vertLines: { color: 'rgba(15, 23, 42, 0.04)', style: LW.LineStyle.Solid },
      horzLines: { color: 'rgba(15, 23, 42, 0.04)', style: LW.LineStyle.Solid }
    },
    crosshair: {
      mode: LW.CrosshairMode ? LW.CrosshairMode.Normal : 0,
      vertLine: {
        color: 'rgba(82, 44, 128, 0.12)',
        width: 1,
        style: LW.LineStyle.LargeDashed,
        labelBackgroundColor: '#522C80'
      },
      horzLine: {
        color: 'rgba(82, 44, 128, 0.15)',
        width: 1,
        style: LW.LineStyle.Dashed,
        labelBackgroundColor: '#522C80'
      }
    },
    width: container.clientWidth,
    height: 208,
    rightPriceScale: {
      borderVisible: false,
      scaleMargins: { top: 0.06, bottom: 0.05 },
      entireTextOnly: false
    },
    timeScale: {
      borderVisible: false,
      timeVisible: true,
      secondsVisible: false,
      barSpacing: 5,
      minBarSpacing: 2
    },
    localization: { locale: 'ru-RU' }
  };

  candleChart = LW.createChart(container, chartOptions);
  var series = candleChart.addCandlestickSeries({
    upColor: '#16A34A',
    downColor: '#DC2626',
    borderUpColor: '#15803D',
    borderDownColor: '#B91C1C',
    wickUpColor: '#166534',
    wickDownColor: '#991B1B',
    borderVisible: true,
    priceLineVisible: true,
    priceLineWidth: 1,
    priceLineColor: 'rgba(82, 44, 128, 0.35)',
    priceLineStyle: LW.LineStyle.Dashed,
    lastValueVisible: true
  });
  series.setData(candleSeries);
  candleChart.timeScale().fitContent();

  volumeChart = LW.createChart(volContainer, {
    ...chartOptions,
    layout: {
      ...chartOptions.layout,
      background: { type: 'solid', color: '#FAFAFB' }
    },
    height: 72,
    crosshair: {
      mode: LW.CrosshairMode ? LW.CrosshairMode.Normal : 0,
      vertLine: { visible: false, labelVisible: false },
      horzLine: { visible: false, labelVisible: false }
    },
    rightPriceScale: { scaleMargins: { top: 0.75, bottom: 0 }, borderVisible: false }
  });
  var volSer = volumeChart.addHistogramSeries({
    color: 'rgba(82, 44, 128, 0.38)',
    priceScaleId: 'right',
    base: 0
  });
  volSer.setData(volSeries);
  volumeChart.timeScale().fitContent();

  return candles[candles.length - 1]?.close ?? null;
}

function resizeCharts() {
  if (candleChart) {
    var el = document.getElementById('candlestickChart');
    if (el) candleChart.applyOptions({ width: el.clientWidth });
  }
  if (volumeChart) {
    var el2 = document.getElementById('volumeChart');
    if (el2) volumeChart.applyOptions({ width: el2.clientWidth });
  }
}
