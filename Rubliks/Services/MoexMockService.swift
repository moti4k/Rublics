//
//  MoexMockService.swift
//  Rubliks
//
//  Mock for Moscow Exchange API.
//  Real MOEX ISS: engines/stock/markets/shares/boards/TQBR/securities/{secid}/candles
//

import Foundation
import SwiftUI

/// Тикеры по умолчанию для запроса к MOEX ISS.
private let defaultStockTickers = ["SBER", "GAZP", "LKOH", "YNDX", "GMKN", "NVTK", "ROSN", "MGNT"]

final class MoexMockService {
    static let shared = MoexMockService()
    
    private init() {}

    // MARK: - Real MOEX ISS API (async)
    /// Загружает свечи по выбранному масштабу: данные «от сейчас» назад на заданный период.
    /// Лимит свечей подобран так, чтобы по умолчанию они не накладывались.
    func fetchCandles(secid: String, scale: ChartScale) async -> [CandleData] {
        let cal = Calendar.current
        let to = Date()
        let (interval, limit, from): (Int, Int, Date) = {
            switch scale {
            case .allTime:
                let from = cal.date(byAdding: .year, value: -2, to: to) ?? to
                return (24, 250, from)
            case .months:
                let from = cal.date(byAdding: .month, value: -6, to: to) ?? to
                return (24, 90, from)
            case .days:
                let from = cal.date(byAdding: .day, value: -45, to: to) ?? to
                return (24, 45, from)
            case .hours:
                let from = cal.date(byAdding: .day, value: -1, to: to) ?? to
                return (60, 24, from)
            case .minutes:
                let from = cal.date(byAdding: .hour, value: -6, to: to) ?? to
                return (10, 36, from)
            }
        }()
        do {
            let list = try await MoexIssApi.fetchCandles(secid: secid, interval: interval, from: from, till: to, limit: limit)
            return list.isEmpty ? getCandles(secid: secid, from: from, to: to, interval: interval, limit: limit) : list
        } catch {
            return getCandles(secid: secid, from: from, to: to, interval: interval, limit: limit)
        }
    }

    /// Подгрузка более старых свечей (до указанной даты). Для бесконечного скролла влево.
    func fetchOlderCandles(secid: String, scale: ChartScale, before: Date) async -> [CandleData] {
        let cal = Calendar.current
        let (interval, limit, from): (Int, Int, Date) = {
            switch scale {
            case .allTime: return (24, 100, cal.date(byAdding: .year, value: -1, to: before) ?? before)
            case .months:  return (24, 90, cal.date(byAdding: .month, value: -6, to: before) ?? before)
            case .days:    return (24, 45, cal.date(byAdding: .day, value: -45, to: before) ?? before)
            case .hours:   return (60, 24, cal.date(byAdding: .day, value: -1, to: before) ?? before)
            case .minutes: return (10, 36, cal.date(byAdding: .hour, value: -6, to: before) ?? before)
            }
        }()
        do {
            let list = try await MoexIssApi.fetchCandles(secid: secid, interval: interval, from: from, till: before, limit: limit)
            return list.filter { $0.date < before }.sorted { $0.date < $1.date }
        } catch {
            return getCandles(secid: secid, from: from, to: cal.date(byAdding: .second, value: -1, to: before)!, interval: interval, limit: limit)
        }
    }

    /// Загружает дневные свечи (legacy). При ошибке возвращает mock.
    func fetchCandles(secid: String, from: Date? = nil, to: Date? = nil) async -> [CandleData] {
        await fetchCandles(secid: secid, scale: .days)
    }

    /// Загружает список акций с текущими ценами с Мосбиржи. При ошибке — mock.
    func fetchStocks() async -> [StockItem] {
        do {
            let data = try await MoexIssApi.fetchMarketData(secids: defaultStockTickers)
            return data.map { row in
                let change = row.open != 0 ? ((row.last - row.open) / row.open) * 100 : 0
                return StockItem(id: row.secid, ticker: row.secid, name: row.shortname, price: row.last, changePercent: change)
            }
        } catch {
            return getStocks()
        }
    }

    /// Актуальные цены по тикерам (последняя сделка). Для покупки/продажи по рыночной цене.
    func fetchCurrentPrices(secids: [String]) async -> [String: Double] {
        let list = secids.isEmpty ? [] : Array(secids.prefix(50))
        guard !list.isEmpty else { return [:] }
        do {
            let data = try await MoexIssApi.fetchMarketData(secids: list)
            return Dictionary(uniqueKeysWithValues: data.map { ($0.secid, $0.last) })
        } catch {
            let fallback = getStocks()
            return Dictionary(uniqueKeysWithValues: fallback.map { ($0.ticker, $0.price) })
        }
    }

    /// Серия объёмов по свечам (после загрузки свечей).
    func volumeSeries(from candles: [CandleData], count: Int) -> [VolumePoint] {
        candles.prefix(count).enumerated().map { i, c in
            VolumePoint(id: "vol_\(i)", date: c.date, value: c.volume ?? 0)
        }
    }
    
    // MARK: - Candles (OHLC) — mock / fallback
    /// interval: 1 (мин), 10 (10 мин), 60 (час), 24 (день)
    func getCandles(secid: String = "SBER", from: Date? = nil, to: Date? = nil, interval: Int = 24, limit: Int = 100) -> [CandleData] {
        let calendar = Calendar.current
        let end = to ?? Date()
        let start = from ?? calendar.date(byAdding: .day, value: -30, to: end)!
        var current = start
        var open = 240.0
        var list: [CandleData] = []
        var id = 0
        let step: (Calendar.Component, Int) = {
            switch interval {
            case 1: return (.minute, 1)
            case 10: return (.minute, 10)
            case 60: return (.hour, 1)
            default: return (.day, 1)
            }
        }()
        while current <= end, list.count < limit {
            let variation = Double.random(in: -3...3)
            let high = open + abs(variation) + Double.random(in: 0...1)
            let low = open - abs(variation) - Double.random(in: 0...1)
            let close = open + variation
            list.append(CandleData(
                id: "\(secid)_\(id)",
                date: current,
                open: open,
                high: high,
                low: low,
                close: close,
                volume: Double.random(in: 100_000...500_000)
            ))
            open = close
            current = calendar.date(byAdding: step.0, value: step.1, to: current) ?? current
            id += 1
        }
        return list
    }
    
    /// Mock volume series for secondary chart (same dates as candles)
    func getVolumeSeries(secid: String = "SBER", count: Int = 30) -> [VolumePoint] {
        let candles = getCandles(secid: secid)
        return candles.prefix(count).enumerated().map { i, c in
            VolumePoint(
                id: "vol_\(i)",
                date: c.date,
                value: c.volume ?? Double.random(in: 50_000...400_000)
            )
        }
    }
    
    // MARK: - News
    func getNews(limit: Int = 10) -> [NewsItem] {
        [
            NewsItem(
                id: "1",
                title: "НОВОСТИ",
                snippet: "Акции компании по производству подушек выросли на 300% после того как генеральный директор объявил о партнёрстве с крупным ритейлером.",
                date: Date()
            ),
            NewsItem(
                id: "2",
                title: "НОВОСТИ",
                snippet: "Центробанк оставил ключевую ставку без изменений. Эксперты ожидают стабилизации на фондовом рынке.",
                date: Date().addingTimeInterval(-86400)
            ),
            NewsItem(
                id: "3",
                title: "НОВОСТИ",
                snippet: "Фьючерсы на нефть показывают рост на фоне сокращения добычи. Рубль укрепляется.",
                date: Date().addingTimeInterval(-172800)
            )
        ]
    }
    
    // MARK: - Topic cards for Home
    func getTopicCards() -> [TopicCard] {
        [
            TopicCard(
                id: "crypto",
                title: "КРИПТОВАЛЮТА",
                description: "что это, зачем и как работает",
                color: AppTheme.accentRed,
                route: .topic("crypto")
            ),
            TopicCard(
                id: "futures",
                title: "ФЬЮЧЕРСЫ",
                description: "договор о будущем",
                color: AppTheme.cardPink,
                route: .topic("futures")
            ),
            TopicCard(
                id: "taxes",
                title: "НАЛОГИ",
                description: "почему ты отдаёшь часть дохода и куда она уходит",
                color: AppTheme.cardPurpleLight,
                route: .topic("taxes")
            ),
            TopicCard(
                id: "stock",
                title: "ФОНДОВЫЙ РЫНОК",
                description: "где акции становятся деньгами",
                color: AppTheme.cardPurpleDark,
                route: .topic("stock")
            )
        ]
    }

    // MARK: - Crypto (mock list; позже — API)
    struct CryptoItem: Identifiable {
        let id: String
        let symbol: String
        let name: String
        let priceRub: Double
    }
    func getCryptoList() -> [CryptoItem] {
        [
            CryptoItem(id: "BTC", symbol: "BTC", name: "Биткоин", priceRub: 6_200_000),
            CryptoItem(id: "ETH", symbol: "ETH", name: "Эфириум", priceRub: 340_000),
            CryptoItem(id: "USDT", symbol: "USDT", name: "Tether", priceRub: 98),
            CryptoItem(id: "SOL", symbol: "SOL", name: "Solana", priceRub: 18_500),
            CryptoItem(id: "TON", symbol: "TON", name: "Toncoin", priceRub: 520),
        ]
    }
    func getCryptoPrices() -> [String: Double] {
        Dictionary(uniqueKeysWithValues: getCryptoList().map { ($0.symbol, $0.priceRub) })
    }

    // MARK: - Stocks (companies)
    func getStocks() -> [StockItem] {
        [
            StockItem(id: "SBER", ticker: "SBER", name: "Сбербанк", price: 248.50, changePercent: 1.2),
            StockItem(id: "GAZP", ticker: "GAZP", name: "Газпром", price: 128.90, changePercent: -0.5),
            StockItem(id: "LKOH", ticker: "LKOH", name: "Лукойл", price: 6840.0, changePercent: 2.1),
            StockItem(id: "YNDX", ticker: "YNDX", name: "Яндекс", price: 3850.0, changePercent: 0.8),
            StockItem(id: "GMKN", ticker: "GMKN", name: "Норникель", price: 15820.0, changePercent: -1.0),
            StockItem(id: "NVTK", ticker: "NVTK", name: "Новатэк", price: 1189.0, changePercent: 1.5),
            StockItem(id: "ROSN", ticker: "ROSN", name: "Роснефть", price: 568.40, changePercent: 0.3),
            StockItem(id: "MGNT", ticker: "MGNT", name: "Магнит", price: 6820.0, changePercent: -0.2)
        ]
    }

    // MARK: - Balance (mock)
    func getBalance() -> Double { 100_000.00 }

    private let subscriptionKey = "selectedSubscriptionId"
    func getCurrentSubscriptionId() -> String {
        UserDefaults.standard.string(forKey: subscriptionKey) ?? "free"
    }
    func setSubscription(id: String) {
        UserDefaults.standard.set(id, forKey: subscriptionKey)
    }
    func getSubscriptionPlans() -> [SubscriptionPlan] {
        [
            SubscriptionPlan(
                id: "free",
                name: "Бесплатный",
                price: "0 ₽",
                period: "навсегда",
                priceSubtitle: nil,
                features: ["5 квизов в день", "Базовые темы", "Реклама"],
                color: AppTheme.textSecondary,
                isBestOffer: false
            ),
            SubscriptionPlan(
                id: "basic",
                name: "Базовый",
                price: "499 ₽",
                period: "в месяц",
                priceSubtitle: "Первая неделя бесплатно, потом 499 ₽/мес",
                features: ["Безлимитные квизы", "Все темы", "Без рекламы", "Поддержка"],
                color: AppTheme.cardPurpleLight,
                isBestOffer: true
            ),
            SubscriptionPlan(
                id: "pro",
                name: "Про",
                price: "799 ₽",
                period: "в месяц",
                priceSubtitle: nil,
                features: ["Всё из Базового", "Консультации экспертов", "Расширенная аналитика", "Приоритетная поддержка"],
                color: AppTheme.accentRed,
                isBestOffer: false
            )
        ]
    }

    // MARK: - Quiz по акциям: событие в мире/компании/индустрии → Купить / Продать / Воздержаться
    /// Вопросы упорядочены по сложности: первые — проще, дальше — сложнее.
    func getQuizItems() -> [QuizItem] {
        [
            // —— Уровень 1: простые однозначные новости ——
            QuizItem(
                id: "sq1",
                question: "Мировые цены на нефть выросли на 15% за неделю. Что делать с акциями Лукойла?",
                options: ["Купить акции Лукойла", "Продать акции Лукойла", "Воздержаться от сделки"],
                explanation: "Нефтяные компании зарабатывают на цене нефти. Рост цен на нефть обычно поддерживает выручку и прибыль Лукойла, поэтому логичная реакция — рассматривать покупку. Важно учитывать и свой горизонт инвестирования.",
                correctAnswerIndex: 0
            ),
            QuizItem(
                id: "sq2",
                question: "Газпром подписал долгосрочный контракт на поставки газа в Китай. Акции Газпрома.",
                options: ["Купить акции Газпрома", "Продать акции Газпрома", "Воздержаться от сделки"],
                explanation: "Долгосрочный контракт даёт стабильность выручки и снижает риски. Для газовой компании это позитивный сигнал — рынок часто реагирует ростом котировок.",
                correctAnswerIndex: 0
            ),
            QuizItem(
                id: "sq3",
                question: "У нефтяной компании крупная авария на месторождении и многомиллиардный штраф. Акции этой компании.",
                options: ["Купить акции", "Продать акции", "Воздержаться от сделки"],
                explanation: "Авария и штраф — прямой удар по репутации, затратам и возможным судам. Краткосрочно это сильный негатив; разумная реакция — снижать риски и не держать позицию без переоценки.",
                correctAnswerIndex: 1
            ),
            QuizItem(
                id: "sq4",
                question: "Цены на никель на мировых биржах выросли на 25%. Акции Норникеля.",
                options: ["Купить акции Норникеля", "Продать акции Норникеля", "Воздержаться от сделки"],
                explanation: "Норникель — крупный производитель никеля. Рост цен на металл напрямую улучшает выручку и маржинальность. Такая новость часто поддерживает котировки.",
                correctAnswerIndex: 0
            ),
            QuizItem(
                id: "sq5",
                question: "Регулятор ввёл ограничение на комиссии банков. Акции Сбербанка.",
                options: ["Купить акции Сбербанка", "Продать акции Сбербанка", "Воздержаться от сделки"],
                explanation: "Ограничение комиссий снижает доходность банковского бизнеса. Для Сбербанка это давление на прибыль — типичная реакция инвесторов негативная.",
                correctAnswerIndex: 1
            ),
            // —— Уровень 2: нужна интерпретация ——
            QuizItem(
                id: "sq6",
                question: "Яндекс приобрёл крупного конкурента за большие деньги. Акции Яндекса.",
                options: ["Купить акции Яндекса", "Продать акции Яндекса", "Воздержаться от сделки"],
                explanation: "При слияниях и поглощениях часто бывает переплата, а синергии видны не сразу. Разумно подождать отчётность и комментарии руководства, прежде чем менять позицию.",
                correctAnswerIndex: 2
            ),
            QuizItem(
                id: "sq7",
                question: "Норникель сообщил об аварии на руднике, производство приостановлено. Акции Норникеля.",
                options: ["Купить акции Норникеля", "Продать акции Норникеля", "Воздержаться от сделки"],
                explanation: "Остановка производства ведёт к падению выручки и рискам по репутации и штрафам. До выяснения масштабов и сроков восстановления позиция по акциям рискованна.",
                correctAnswerIndex: 1
            ),
            QuizItem(
                id: "sq8",
                question: "Центробанк резко повысил ключевую ставку. Акции Сбербанка.",
                options: ["Купить акции Сбербанка", "Продать акции Сбербанка", "Воздержаться от сделки"],
                explanation: "Для банков рост ставки — плюс к марже по кредитам, но минус для экономики и качества кредитного портфеля. Итог неочевиден, рынок может реагировать по-разному. Лучше не действовать на эмоциях одной новости.",
                correctAnswerIndex: 2
            ),
            QuizItem(
                id: "sq9",
                question: "Роснефть потеряла ключевой экспортный рынок из-за санкций. Акции Роснефти.",
                options: ["Купить акции Роснефти", "Продать акции Роснефти", "Воздержаться от сделки"],
                explanation: "Потеря крупного рынка сбыта напрямую бьёт по выручке и планам компании. Это сильный негативный фактор — инвесторы часто переоценивают риски вниз.",
                correctAnswerIndex: 1
            ),
            QuizItem(
                id: "sq10",
                question: "Новатэк успешно запустил новый завод по сжиженному газу. Акции Новатэка.",
                options: ["Купить акции Новатэка", "Продать акции Новатэка", "Воздержаться от сделки"],
                explanation: "Новые мощности увеличивают производство и выручку. Для газовой компании это долгосрочный позитивный драйвер — рынок часто закладывает такой сценарий в цену заранее, но сигнал в целом благоприятный.",
                correctAnswerIndex: 0
            ),
            // —— Уровень 3: сложнее, несколько факторов ——
            QuizItem(
                id: "sq11",
                question: "Сбербанк отчитался о рекордной квартальной прибыли, выше прогнозов аналитиков. Акции Сбербанка.",
                options: ["Купить акции Сбербанка", "Продать акции Сбербанка", "Воздержаться от сделки"],
                explanation: "Хорошие новости часто уже заложены в цену до отчёта. Покупка «на новости» может оказаться входом на пике. Разумнее не менять позицию резко или дождаться отката.",
                correctAnswerIndex: 2
            ),
            QuizItem(
                id: "sq12",
                question: "Газпром объявил о сокращении дивидендов в следующем году. Акции Газпрома.",
                options: ["Купить акции Газпрома", "Продать акции Газпрома", "Воздержаться от сделки"],
                explanation: "Снижение дивидендов уменьшает привлекательность для инвесторов, ориентированных на доход. Обычно котировки реагируют негативно.",
                correctAnswerIndex: 1
            ),
            QuizItem(
                id: "sq13",
                question: "В стране ввели жёсткий локдаун на месяц. Акции ритейлера «Магнит».",
                options: ["Купить акции Магнита", "Продать акции Магнита", "Воздержаться от сделки"],
                explanation: "Локдаун создаёт неопределённость: с одной стороны — паника и закупки, с другой — ограничение передвижений. Итог для выручки неочевиден. Лучше не принимать решений на эмоциях.",
                correctAnswerIndex: 2
            ),
            QuizItem(
                id: "sq14",
                question: "Сбербанк запустил подписку на кино и музыку. Акции Сбербанка.",
                options: ["Купить акции Сбербанка", "Продать акции Сбербанка", "Воздержаться от сделки"],
                explanation: "Для банка такой продукт — малая доля выручки. Одна новость о сервисе не должна быть поводом менять инвестиционную позицию по акциям.",
                correctAnswerIndex: 2
            ),
            QuizItem(
                id: "sq15",
                question: "Криптобиржа-партнёр Сбербанка подверглась хакерской атаке. Акции Сбербанка.",
                options: ["Купить акции Сбербанка", "Продать акции Сбербанка", "Воздержаться от сделки"],
                explanation: "Удар по партнёру — косвенный риск для репутации, но не прямой удар по балансу Сбербанка. Паническая распродажа из одной новости часто неоправданна. Разумнее оценить последствия и не спешить.",
                correctAnswerIndex: 2
            ),
            QuizItem(
                id: "sq16",
                question: "Лукойл объявил об открытии нового крупного месторождения в сложном регионе. Акции Лукойла.",
                options: ["Купить акции Лукойла", "Продать акции Лукойла", "Воздержаться от сделки"],
                explanation: "Новые запасы — долгосрочный плюс для нефтяной компании, но разработка займёт годы и потребует затрат. Для долгосрочного инвестора это может быть аргумент в пользу покупки при адекватной цене.",
                correctAnswerIndex: 0
            ),
            QuizItem(
                id: "sq17",
                question: "У главного конкурента «Магнита» скандал с поставщиками, часть полок в магазинах пустая. Акции Магнита.",
                options: ["Купить акции Магнита", "Продать акции Магнита", "Воздержаться от сделки"],
                explanation: "Проблемы конкурента могут перераспределить спрос в пользу Магнита. Относительно сектора это может быть позитив для котировок при прочих равных.",
                correctAnswerIndex: 0
            ),
            QuizItem(
                id: "sq18",
                question: "Норникель объявил о многомиллиардных экологических инвестициях. Акции Норникеля.",
                options: ["Купить акции Норникеля", "Продать акции Норникеля", "Воздержаться от сделки"],
                explanation: "Экологические расходы бьют по прибыли сейчас, а польза и снижение рисков — в будущем. Реакция рынка часто неоднозначна. Разумно не торопиться с выводом.",
                correctAnswerIndex: 2
            ),
            QuizItem(
                id: "sq19",
                question: "Роснефть отчиталась о рекордной прибыли, но аналитики ожидали ещё выше. Акции Роснефти.",
                options: ["Купить акции Роснефти", "Продать акции Роснефти", "Воздержаться от сделки"],
                explanation: "«Рекорд» уже мог быть в цене, а результат ниже ожиданий даёт разочарование. В таких случаях котировки часто падают. Не стоит автоматически покупать на «хороших» заголовках.",
                correctAnswerIndex: 2
            ),
            QuizItem(
                id: "sq20",
                question: "Магнит открыл 500 новых магазинов за год, но долг компании существенно вырос. Акции Магнита.",
                options: ["Купить акции Магнита", "Продать акции Магнита", "Воздержаться от сделки"],
                explanation: "Рост сети — плюс к выручке, но растущий долг увеличивает риски. Нужен анализ: окупаемость новых точек и способность обслуживать долг. Без этого лучше не увеличивать позицию.",
                correctAnswerIndex: 2
            )
        ]
    }
}
