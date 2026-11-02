/* Rubliks Web - candlestick and volume charts (Lightweight Charts) */

let candleChart = null;
let volumeChart = null;
let chartResizeObserver = null;

function destroyCharts() {
  if (chartResizeObserver) { chartResizeObserver.disconnect(); chartResizeObserver = null; }
  if (candleChart) {
    candleChart.remove();
    candleChart = null;
  }
  if (volumeChart) {
    volumeChart.remove();
    volumeChart = null;
  }
}

function buildCharts(containerId, volumeContainerId, candles, scale, visibleRange, precision = 2) {
  destroyCharts();
  const container = document.getElementById(containerId);
  const volContainer = document.getElementById(volumeContainerId);
  if (!container || !volContainer || !candles || candles.length === 0) return null;
  // MOEX may repeat a boundary candle. Lightweight Charts requires unique, ordered times.
  candles = normalizeCandles(candles);
  if (!candles.length) return null;

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
  var intraday = scale === 'hours' || scale === 'minutes';
  var moscowTime = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' });
  var fontStack = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  var chartOptions = {
    layout: {
      background: { type: 'solid', color: '#FFFFFF' },
      textColor: '#657266',
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
        color: 'rgba(62, 91, 75, 0.12)',
        width: 1,
        style: LW.LineStyle.LargeDashed,
        labelBackgroundColor: '#3E5B4B'
      },
      horzLine: {
        color: 'rgba(62, 91, 75, 0.15)',
        width: 1,
        style: LW.LineStyle.Dashed,
        labelBackgroundColor: '#3E5B4B'
      }
    },
    width: container.clientWidth,
    height: 208,
    rightPriceScale: {
      borderVisible: false,
      minimumWidth: 64,
      scaleMargins: { top: 0.06, bottom: 0.05 },
      entireTextOnly: false
    },
    timeScale: {
      borderVisible: false,
      timeVisible: intraday,
      tickMarkFormatter: (time, type) => intraday && (type === LW.TickMarkType.Time || type === LW.TickMarkType.TimeWithSeconds)
        ? moscowTime.format(new Date(time * 1000)) : null,
      secondsVisible: false,
      barSpacing: 5,
      minBarSpacing: 2
    },
    localization: { locale: 'ru-RU', timeFormatter: time => new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow', dateStyle: 'short', ...(intraday ? { timeStyle: 'short' } : {})
    }).format(new Date(time * 1000)) }
  };

  candleChart = LW.createChart(container, chartOptions);
  var series = candleChart.addCandlestickSeries({
    priceFormat: { type: 'price', precision, minMove: Math.pow(10, -precision) },
    upColor: '#2F8150',
    downColor: '#C05242',
    borderUpColor: '#15803D',
    borderDownColor: '#B91C1C',
    wickUpColor: '#166534',
    wickDownColor: '#991B1B',
    borderVisible: true,
    priceLineVisible: true,
    priceLineWidth: 1,
    priceLineColor: 'rgba(62, 91, 75, 0.35)',
    priceLineStyle: LW.LineStyle.Dashed,
    lastValueVisible: true
  });
  series.setData(candleSeries);

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
    rightPriceScale: { scaleMargins: { top: 0.15, bottom: 0 }, borderVisible: false, minimumWidth: 64 }
  });
  var volSer = volumeChart.addHistogramSeries({
    color: 'rgba(62, 91, 75, 0.38)',
    priceScaleId: 'right',
    base: 0,
    priceFormat: { type: 'volume' }
  });
  volSer.setData(volSeries);
  var initialRange = visibleRange || { from: -0.5, to: candles.length - 0.5 };
  candleChart.timeScale().setVisibleLogicalRange(initialRange);
  volumeChart.timeScale().setVisibleLogicalRange(initialRange);

  // Keep candle dates and volumes aligned when either chart is panned or zoomed.
  var syncing = false;
  function syncRange(target, range) {
    if (!range || syncing) return;
    var current = target.timeScale().getVisibleLogicalRange();
    if (current && Math.abs(current.from - range.from) < 0.001 && Math.abs(current.to - range.to) < 0.001) return;
    syncing = true;
    target.timeScale().setVisibleLogicalRange(range);
    syncing = false;
  }
  candleChart.timeScale().subscribeVisibleLogicalRangeChange(range => syncRange(volumeChart, range));
  volumeChart.timeScale().subscribeVisibleLogicalRangeChange(range => syncRange(candleChart, range));
  chartResizeObserver = new ResizeObserver(resizeCharts);
  chartResizeObserver.observe(container);
  chartResizeObserver.observe(volContainer);

  return candles[candles.length - 1]?.close ?? null;
}

function resizeCharts() {
  if (candleChart) {
    var el = document.getElementById('candlestickChart');
    if (el && el.clientWidth > 0 && candleChart.options().width !== el.clientWidth) candleChart.applyOptions({ width: el.clientWidth });
  }
  if (volumeChart) {
    var el2 = document.getElementById('volumeChart');
    if (el2 && el2.clientWidth > 0 && volumeChart.options().width !== el2.clientWidth) volumeChart.applyOptions({ width: el2.clientWidth });
  }
}
